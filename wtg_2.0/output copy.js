// output.js - Handle AI responses and update storycards for the new WTG implementation

const modifier = (text) => {
  // Ensure state.turnTime is always initialized
  state.turnTime = state.turnTime || {years:0, months:0, days:0, hours:0, minutes:0, seconds:0};

  let modifiedText = text;

  // Check if WTG is disabled entirely
  if (getWTGBooleanSetting("Disable WTG Entirely")) {
    return {text: text};
  }

  if (state.startingDate === '01/01/1900') {
    modifiedText = ' Please switch to story mode and use the command, [settime mm/dd/yyyy time] to set a custom starting date and time. (eg: [settime 01/01/1900 12:00 am])\n\nTo report bugs, message me on discord: thedenial. (it has a period at the end of it)';
    return {text: modifiedText};
  }

  // Update storycard entries for characters detected in the previous turn
  if (state.pendingCharacterEntries) {
    // Get the last action from history to use as the entry content
    let lastAction = null;
    for (let i = history.length - 1; i >= 0; i--) {
      const action = history[i];
      if (action.type === "do" || action.type === "say" || action.type === "story") {
        lastAction = action;
        break;
      }
    }
    
    // If we found a player action, use its text as the entry content
    if (lastAction) {
      const entryText = lastAction.text;
      
      // Update storycards for all pending characters
      let allProcessed = true;
      for (const name in state.pendingCharacterEntries) {
        if (state.pendingCharacterEntries[name]) {
          // Find the storycard for this character
          const card = storyCards.find(c => c.title === name);
          if (card) {
            // Update the entry with the discovery action
            card.entry = entryText.substring(0, 200) + (entryText.length > 200 ? '...' : '');
          }
          // Mark as processed
          state.pendingCharacterEntries[name] = false;
        }
        // Check if there are still unprocessed entries
        if (state.pendingCharacterEntries[name]) {
          allProcessed = false;
        }
      }
      
      // Clean up: Remove the pendingCharacterEntries object if all entries are processed
      if (allProcessed) {
        delete state.pendingCharacterEntries;
      }
    }
  }

  // Get the last action from history to determine action type
  let lastAction = null;
  let actionType = "continue"; // Default to continue if no player action found
  
  // Look for the most recent player action (do, say, story)
  for (let i = history.length - 1; i >= 0; i--) {
    const action = history[i];
    if (action.type === "do" || action.type === "say" || action.type === "story") {
      lastAction = action;
      actionType = action.type;
      break;
    }
  }
  
  // Initialize generatedEntities array for tracking
  let generatedEntities = [];

  // ========================================================================
  // ENTITY DETECTION AND STORYCARD CREATION - MUST RUN EARLY ON PRISTINE AI OUTPUT
  // ========================================================================
  // This section MUST execute before any text manipulation to ensure reliable
  // entity detection from the original AI output with parentheses intact.
  {
    // Get the full turn's output for storycard entries
    let fullTurnOutput = "";
    if (lastAction) {
      fullTurnOutput = `Player: ${lastAction.text}\nAI: ${text}`;
    } else {
      fullTurnOutput = text;
    }

    // Command blacklist to prevent system commands from creating storycards
    const commandBlacklist = [
      'settime', 'advance', 'reset', 'sleep', 'help', 'status', 'time', 'date',
      'config', 'settings', 'debug', 'test', 'version', 'info', 'list', 'show',
      'clear', 'delete', 'remove', 'add', 'create', 'update', 'modify', 'change',
      'sleep', 'advance'
    ];

    // Helper function to check if entity name is a blacklisted command
    const isBlacklistedCommand = (entityName) => {
      const lowerName = entityName.toLowerCase();
      return commandBlacklist.some(cmd => lowerName.includes(cmd) || cmd.includes(lowerName));
    };

    // Helper function to check if a new entity name is a duplicate/variation of existing names
    const isDuplicateEntityName = (newName, existingCards) => {
      const newNameLower = newName.toLowerCase().trim();
      const newNameWords = newNameLower.split(/\s+/);

      for (const card of existingCards) {
        const existingNameLower = card.title.toLowerCase().trim();
        const existingNameWords = existingNameLower.split(/\s+/);

        // Check if new name is contained within existing name (e.g., "John" in "John Smith")
        if (existingNameLower.includes(newNameLower)) {
          return { isDuplicate: true, existingCard: card };
        }

        // Check if existing name is contained within new name (e.g., "John" -> "John Smith")
        if (newNameLower.includes(existingNameLower)) {
          return { isDuplicate: true, existingCard: card };
        }

        // Check for partial word matches (first/last name variations)
        const commonWords = newNameWords.filter(word =>
          existingNameWords.some(existingWord =>
            existingWord.includes(word) || word.includes(existingWord)
          )
        );

        // If more than 50% of words match, consider it a duplicate
        if (commonWords.length > 0 && (commonWords.length / Math.max(newNameWords.length, existingNameWords.length)) > 0.5) {
          return { isDuplicate: true, existingCard: card };
        }
      }

      return { isDuplicate: false, existingCard: null };
    };

    // Helper function to extract contextual sentences around entity mentions
    const extractContextualSentences = (text, entityName, sentencesBefore = 2, sentencesAfter = 2) => {
      // Split text into sentences using common sentence endings
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);

      // Find the sentence containing the entity
      const entityIndex = sentences.findIndex(sentence =>
        sentence.toLowerCase().includes(entityName.toLowerCase())
      );

      if (entityIndex === -1) {
        // If entity not found, return a portion of the text
        return text.substring(0, 300) + (text.length > 300 ? '...' : '');
      }

      // Calculate the range of sentences to include
      const startIndex = Math.max(0, entityIndex - sentencesBefore);
      const endIndex = Math.min(sentences.length - 1, entityIndex + sentencesAfter);

      // Extract the contextual sentences
      const contextualSentences = sentences.slice(startIndex, endIndex + 1);

      // Join them back with periods and return
      return contextualSentences.join('. ').trim() + '.';
    };

    // Collect all entities introduced in this turn
    generatedEntities = [];
    const existingEntities = [];

    // Parse double-parentheses locations
    const enableLocationCards = getWTGBooleanSetting("Enable Generated Location Cards");
    if (enableLocationCards) {
      const doubleParenRegex = /(?<!\()(\(\()([^\(\)]+?)(\)\))(?!\))/g;
      let doubleParenMatch;
      while ((doubleParenMatch = doubleParenRegex.exec(text)) !== null) {
      const entity = doubleParenMatch[2]; // Capture group 2 is the content between (( ))
      if (entity.length >= 2) {
        const sanitized = sanitizeEntityName(entity);
        const title = normalizeNameCase(sanitized);

        // Skip if entity name matches blacklisted commands
        if (isBlacklistedCommand(title)) {
          continue;
        }

        // Check for duplicate/variation of existing entity names
        const duplicateCheck = isDuplicateEntityName(title, storyCards.filter(c => c.type === "location"));
        if (duplicateCheck.isDuplicate) {
          existingEntities.push({name: title, type: "location", card: duplicateCheck.existingCard});
        } else {
          generatedEntities.push({name: title, type: "location"});
        }
      }
    }
    }

    // Parse single-parentheses characters
    const enableCharacterCards = getWTGBooleanSetting("Enable Generated Character Cards");
    if (enableCharacterCards) {
      const singleParenRegex = /(?<!\()(\()([^\(\)]+?)(\))(?!\))/g;
      let singleParenMatch;
      while ((singleParenMatch = singleParenRegex.exec(text)) !== null) {
        const entity = singleParenMatch[2]; // Capture group 2 is the content between ( )
        if (entity.length >= 2) {
          const sanitized = sanitizeEntityName(entity);
          const title = normalizeNameCase(sanitized);

          // Skip if entity name matches blacklisted commands
          if (isBlacklistedCommand(title)) {
            continue;
          }

          // Check for duplicate/variation of existing character names
          const duplicateCheck = isDuplicateEntityName(title, storyCards.filter(c => c.type === "character"));
          if (duplicateCheck.isDuplicate) {
            existingEntities.push({name: title, type: "character", card: duplicateCheck.existingCard});
          } else {
            generatedEntities.push({name: title, type: "character"});
          }
        }
      }
    }

    // Create discovery card if multiple new entities are introduced
    if (generatedEntities.length > 1) {
      const entityNames = generatedEntities.map(e => e.name);
      const discoveryCardTitle = `${entityNames.join(', ')} Discovery Action`;

      // Create discovery card
      const discoveryCard = findOrCreateCard(discoveryCardTitle);
      if (discoveryCard) {
        discoveryCard.type = "discovery";
        discoveryCard.keys = entityNames.join(',');
        discoveryCard.entry = fullTurnOutput;

        // Add timestamp to discovery card
        if (!hasTimestamp(discoveryCard)) {
          addTimestampToCard(discoveryCard, `${state.currentDate} ${state.currentTime}`, true);
        }
      }

      // Create individual entity cards with minimal content
      for (const entity of generatedEntities) {
        const keys = normalizeKeysFor(entity.name);
        const card = findOrCreateCard(entity.name);
        if (card) {
          card.type = entity.type;
          card.keys = keys.join(',');
          // Only store timestamp and minimal info, not the full turn content
          card.entry = `Discovered in: ${discoveryCardTitle}`;
          // Add timestamp if not present
          if (!hasTimestamp(card)) {
            addTimestampToCard(card, `${state.currentDate} ${state.currentTime}`, true);
          }
        }
      }
    } else if (generatedEntities.length === 1) {
      // Single new entity - create card with contextual sentences around the entity mention
      const entity = generatedEntities[0];
      const keys = normalizeKeysFor(entity.name);
      const card = findOrCreateCard(entity.name);
      if (card) {
        card.type = entity.type;
        card.keys = keys.join(',');
        // Extract 2 sentences before and 2 sentences after the entity mention from AI response
        card.entry = extractContextualSentences(text, entity.name, 2, 2);
        // Add timestamp if not present
        if (!hasTimestamp(card)) {
          addTimestampToCard(card, `${state.currentDate} ${state.currentTime}`, true);
        }
      }
    }

    // Update existing entity cards (only add timestamps if missing)
    for (const entity of existingEntities) {
      if (!hasTimestamp(entity.card)) {
        addTimestampToCard(entity.card, `${state.currentDate} ${state.currentTime}`);
      }
    }

    // Parse triple-parentheses descriptions and inject into storycards
    const tripleParenRegex = /(?<!\()(\(\(\()([^\(\)]+?)(\)\)\))(?!\))/g;
    let tripleParenMatch;
    while ((tripleParenMatch = tripleParenRegex.exec(text)) !== null) {
      const content = tripleParenMatch[2]; // Capture group 2 is the content between ((( )))
      // Parse the content to extract entity name and description
      // Format: (((Entity Name) description))) or (((Entity Name)) description)))
      const entityDescMatch = content.match(/^(\([^()]+\)|\(\([^()]+\)\))\s+(.+)$/);
      if (entityDescMatch) {
        const entityPart = entityDescMatch[1];
        const description = entityDescMatch[2];

        // Extract the entity name from the parentheses
        let entityName = '';
        let entityType = '';

        if (entityPart.startsWith('((') && entityPart.endsWith('))')) {
          // Location: ((Castle))
          entityName = entityPart.slice(2, -2).trim();
          entityType = 'location';
        } else if (entityPart.startsWith('(') && entityPart.endsWith(')')) {
          // Character: (John)
          entityName = entityPart.slice(1, -1).trim();
          entityType = 'character';
        }

        if (entityName && entityType) {
          const sanitized = sanitizeEntityName(entityName);
          const title = normalizeNameCase(sanitized);

          // Find existing storycard or create new one
          let card = storyCards.find(c => c.title.toLowerCase() === title.toLowerCase());
          if (!card) {
            // Create new card if it doesn't exist
            card = findOrCreateCard(title);
          }

          if (card) {
            card.type = entityType;
            const keys = normalizeKeysFor(title);
            card.keys = keys.join(',');

            // Inject the description into the card
            if (!card.entry || card.entry.trim() === '') {
              card.entry = description;
            } else {
              // Append description if card already has content
              card.entry += '\n\n' + description;
            }

            // Add timestamp if not present
            if (!hasTimestamp(card)) {
              addTimestampToCard(card, `${state.currentDate} ${state.currentTime}`, true);
            }
          }
        }
      }
    }
  }
  // ========================================================================
  // END ENTITY DETECTION
  // ========================================================================

  // Check for LLM time commands at the start of the output
  let timeAdjustedByCommand = false;
  const commandRegex = /^\s*\((sleep|advance)\s+(\d+)\s+(\w+)\)\s*/;
  const commandMatch = modifiedText.match(commandRegex);
  if (commandMatch) {
    const verb = commandMatch[1];
    const amount = parseInt(commandMatch[2], 10);
    const unit = commandMatch[3].toLowerCase();
    const fullCommand = commandMatch[0].trim();

    // Check if cooldown is active before processing command
    let shouldProcessCommand = true;
    if (verb === 'sleep' && isSleepCooldownActive()) {
      shouldProcessCommand = false;
    } else if (verb === 'advance' && isAdvanceCooldownActive()) {
      shouldProcessCommand = false;
    }

    // Only process command if no active cooldown
    if (shouldProcessCommand) {
      // Convert to days, hours, minutes
      let days = 0, hours = 0, minutes = 0;
    switch (unit) {
      case 'years':
      case 'year':
        days = amount * 365; // Approximate
        break;
      case 'months':
      case 'month':
        days = amount * 30; // Approximate
        break;
      case 'weeks':
      case 'week':
        days = amount * 7;
        break;
      case 'days':
      case 'day':
        days = amount;
        break;
      case 'hours':
      case 'hour':
        hours = amount;
        break;
      case 'minutes':
      case 'minute':
        minutes = amount;
        break;
      default:
        // Invalid unit, ignore command
        break;
    }

    // Apply the time jump if we have valid values
    if (days > 0 || hours > 0 || minutes > 0) {
      state.turnTime = addToTurnTime(state.turnTime, { days, hours, minutes });
      const { currentDate, currentTime } = computeCurrent(state.startingDate, state.startingTime, state.turnTime);
      state.currentDate = currentDate;
      state.currentTime = currentTime;
      state.changed = true;
      timeAdjustedByCommand = true;

      // Store the command for turn data
      state.aiCommandThisTurn = fullCommand;

      // Set cooldown based on command type using helper functions
      if (verb === 'sleep') {
        setSleepCooldown({hours: 8});
      } else if (verb === 'advance') {
        setAdvanceCooldown({minutes: 5});
      }

      // Store pending command information for time adjustment fallback in cooldown card
      const cooldownCard = getCooldownCard();
      let entry = cooldownCard.entry || "";
      if (verb === 'sleep') {
        const currentTT = formatTurnTime(state.turnTime);
        const {currentDate: initDate, currentTime: initTime} = computeCurrent(state.startingDate, state.startingTime, state.turnTime);
        entry += `\nLast sleep initiated: ${initDate} ${initTime} (${currentTT})\n`;
        entry += `Sleep command: ${fullCommand}\n`;
      } else if (verb === 'advance') {
        const currentTT = formatTurnTime(state.turnTime);
        const {currentDate: initDate, currentTime: initTime} = computeCurrent(state.startingDate, state.startingTime, state.turnTime);
        entry += `\nLast advance initiated: ${initDate} ${initTime} (${currentTT})\n`;
        entry += `Advance command: ${fullCommand}\n`;
      }
      cooldownCard.entry = entry.trim();

        // Remove command from output if Debug Mode is false
        if (!getWTGBooleanSetting("Debug Mode")) {
          modifiedText = modifiedText.replace(commandRegex, '').trim();
        }
      }
    }
    // ALWAYS remove commands during cooldown, even if Debug Mode is true
    if (!shouldProcessCommand) {
      modifiedText = modifiedText.replace(commandRegex, '').trim();
    } else if (!getWTGBooleanSetting("Debug Mode")) {
      // Normal case: remove command if debug mode is false
      modifiedText = modifiedText.replace(commandRegex, '').trim();
    }
  } else {
    // No command this turn
    state.aiCommandThisTurn = null;
  }

  // Final sanitation: remove any remaining (sleep ...) or (advance ...) commands anywhere in the text
  // ALWAYS remove if either cooldown is active, OR if debug mode is false
  const shouldRemoveAllCommands = isSleepCooldownActive() || isAdvanceCooldownActive() || !getWTGBooleanSetting("Debug Mode");
  if (shouldRemoveAllCommands) {
    modifiedText = modifiedText
      .replace(/\((?:sleep|advance)[^)]*\)/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  // Debug mode: Show raw output with parentheses if enabled
  const debugMode = getWTGBooleanSetting("Debug Mode");
  if (debugMode) {
    modifiedText = text; // Keep original text with parentheses for debugging
  } else {
    // Strip all (((...))), ((...)) and (...) from the text for normal mode
    // Use non-greedy matching that handles nested content properly
    
    // First pass: Remove triple parentheses descriptions (((entity) description)))
    // This regex matches from ((( to the last ))) in the sequence
    modifiedText = modifiedText.replace(/\(\(\(.*?\)\)\)/gs, function(match) {
      // Extract just the entity name before the first closing paren
      const innerMatch = match.match(/\(\(\(([^)]+?)\)/);
      return innerMatch ? innerMatch[1] : '';
    });
    
    // Second pass: Remove double parentheses locations ((Location))
    modifiedText = modifiedText.replace(/\(\(([^)]+?)\)\)/g, '$1');
    
    // Third pass: Remove single parentheses characters (Character)
    // But preserve sleep/advance commands
    modifiedText = modifiedText.replace(/\((?!(?:sleep|advance)\s)([^)]+?)\)/g, '$1');
  }

  // Process any existing turn time marker in the text
  const ttMatch = modifiedText.match(/\[\[(.*?)\]\]$/);
  let parsedTT = ttMatch ? parseTurnTime(ttMatch[1]) : null;
  let narrative = ttMatch ? modifiedText.replace(/\[\[.*\]\]$/, '').trim() : modifiedText.trim();
  let charCount = narrative.length;
  
  // Get time duration multiplier from WTG Settings storycard
  let timeMultiplier = 1.0;
  const settingsCard = getWTGSettingsCard();
  if (settingsCard && settingsCard.entry) {
    const multiplierMatch = settingsCard.entry.match(/Time Duration Multiplier: ([\d.]+)/);
    if (multiplierMatch) {
      timeMultiplier = Math.max(0, parseFloat(multiplierMatch[1]) || 1.0);
    }
  }
  
  // Calculate minutes to add based on character count and time multiplier
  let minutesToAdd;
  if (getWTGBooleanSetting("Enable Dynamic Time")) {
    const turnText = (lastAction ? lastAction.text : '') + ' ' + narrative;
    const dynamicFactor = getDynamicTimeFactor(turnText);
    minutesToAdd = Math.floor((charCount / 700) * timeMultiplier * dynamicFactor);
  } else {
    minutesToAdd = Math.floor((charCount / 700) * timeMultiplier);
  }

  // Add warning if AI altered turn time metadata
  if (parsedTT) {
    const currentTTForm = formatTurnTime(state.turnTime);
    if (ttMatch[1] !== currentTTForm) {
      modifiedText += '\n[Warning: Turn time metadata altered by AI. Please retry.]';
    }
  }

  // Update turn time based on character count if starting time is not descriptive and no command was processed
  if (!timeAdjustedByCommand && state.startingTime !== 'Unknown' && minutesToAdd > 0) {
    state.turnTime = addToTurnTime(state.turnTime, {minutes: minutesToAdd});
    const {currentDate, currentTime} = computeCurrent(state.startingDate, state.startingTime, state.turnTime);
    state.currentDate = currentDate;
    state.currentTime = currentTime;
    state.changed = true;
  }

  // Update text without turn time marker (since we're storing in storycard now)
  modifiedText = narrative;

  // Collect trigger mentions for turn data (only after proper time is set)
  let triggerMentions = [];
  if (modifiedText.trim() && state.currentDate !== '01/01/1900' && state.currentTime !== 'Unknown') {
    const responseText = modifiedText.toLowerCase();

    // Check all storycards for trigger matches in AI response
    storyCards.forEach(card => {
      // Skip the WTG Data storycard, Current Date and Time card, and WTG Settings card (already handled)
      if (card.title === "WTG Data" || card.title === "Current Date and Time" || card.title === "World Time Generator Settings") {
        return;
      }

      // Only track triggers for cards that haven't been discovered yet
      if (card.description && (card.description.includes("not yet discovered") || !hasTimestamp(card))) {
        // Check if this card has keys (triggers) and if any are mentioned in the response text
        if (card.keys && areCardTriggersMentioned(card, responseText)) {
          // Split the keys by comma to get individual triggers
          const triggers = card.keys.split(',').map(trigger => trigger.trim());

          // Check each trigger to see if it matches the response text
          for (const trigger of triggers) {
            const lowerTrigger = trigger.toLowerCase();

            // Check for exact match first
            if (responseText.includes(lowerTrigger)) {
              // Add to trigger mentions for turn data
              triggerMentions.push({cardTitle: card.title, trigger: trigger});
              break;
            }

            // Handle multi-word names: if there are two words or more in the trigger,
            // also check if the first word matches
            const triggerWords = lowerTrigger.split(/\s+/);
            if (triggerWords.length >= 2) {
              // Check if the first word of the multi-word trigger appears in the response text
              if (responseText.includes(triggerWords[0])) {
                // Add to trigger mentions for turn data
                triggerMentions.push({cardTitle: card.title, trigger: trigger});
                break;
              }
            }
          }
        }
      }
    });
  }


  // Helper function to extract first two sentences from text for turn data storage
  const extractFirstTwoSentences = (text) => {
    // Split text into sentences using common sentence endings
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);

    // Return first 1-2 sentences
    if (sentences.length === 0) {
      return text.substring(0, 200) + (text.length > 200 ? '...' : '');
    } else if (sentences.length === 1) {
      return sentences[0].trim() + '.';
    } else {
      return sentences.slice(0, 2).join('. ').trim() + '.';
    }
  };

  // Helper function to check if a timestamp is from the future (deprecated)
  const isTimestampDeprecated = (cardTimestamp, currentTimestamp) => {
    try {
      // Parse timestamps (format: MM/DD/YYYY HH:MM AM/PM)
      const parseTimestamp = (timestamp) => {
        const match = timestamp.match(/(\d{1,2})\/(\d{1,2})\/(\d{4}) (\d{1,2}):(\d{2}) ([AP]M)/);
        if (!match) return null;

        let [, month, day, year, hour, minute, ampm] = match;
        month = parseInt(month) - 1; // JavaScript months are 0-based
        day = parseInt(day);
        year = parseInt(year);
        hour = parseInt(hour);
        minute = parseInt(minute);

        // Convert to 24-hour format
        if (ampm === 'PM' && hour !== 12) hour += 12;
        if (ampm === 'AM' && hour === 12) hour = 0;

        return new Date(year, month, day, hour, minute);
      };

      const cardDate = parseTimestamp(cardTimestamp);
      const currentDate = parseTimestamp(currentTimestamp);

      if (!cardDate || !currentDate) return false;

      // If card timestamp is significantly in the future, mark as deprecated
      const timeDiff = cardDate.getTime() - currentDate.getTime();
      const hoursDiff = timeDiff / (1000 * 60 * 60);

      // Consider deprecated if more than 1 hour in the future (to account for minor time differences)
      return hoursDiff > 1;
    } catch (error) {
      // If parsing fails, don't mark as deprecated
      return false;
    }
  };

  // Enhanced "Enable Generated Character Cards" functionality with deprecation logic
  {
    const enableCharacterCards = getWTGBooleanSetting("Enable Generated Character Cards");
  const disableGeneratedCardDeletion = getWTGBooleanSetting("Disable Generated Card Deletion");
  if (!enableCharacterCards && !disableGeneratedCardDeletion) {
    // Process all storycards for deprecation based on timestamp validation
    storyCards.forEach(card => {
      // Skip system cards
      if (card.title === "WTG Data" || card.title === "Current Date and Time" ||
          card.title === "World Time Generator Settings" || card.title === "Deleted Characters") {
        return;
      }

      // Check if card has a timestamp that needs validation
      if (card.entry && card.entry.includes("Discovered on")) {
        const timestampMatch = card.entry.match(/Discovered on (\d{1,2}\/\d{1,2}\/\d{4} \d{1,2}:\d{2} [AP]M)/);
        if (timestampMatch) {
          const cardTimestamp = timestampMatch[1];
          const currentTimestamp = `${state.currentDate} ${state.currentTime}`;

          // If card timestamp is greater than current time, mark as deprecated
          if (isTimestampDeprecated(cardTimestamp, currentTimestamp)) {
            // Move to Deprecated category by updating card properties
            card.type = "deprecated";
            card.description = (card.description || "") + "\n[DEPRECATED: Timestamp from future - moved to deprecated category]";

            // Clear triggers to prevent further mentions
            if (card.keys) {
              // Store original keys for potential recovery
              card.originalKeys = card.keys;
              card.keys = "";
            }

            // Add deprecation notice to entry
            card.entry += "\n\n[DEPRECATED ENTRY - Timestamp appears to be from the future]";
          }
        }
      }

      // Add proper labeling for generated character cards
      if (card.type === "character" && card.description &&
          (card.description.includes("Generated character") || card.description.includes("AI-generated"))) {
        // Ensure proper labeling
        if (!card.description.includes("[AI-GENERATED]")) {
          card.description = "[AI-GENERATED] " + card.description;
        }
      }
    });
  } else {
    // When "Enable Generated Character Cards" is true, still apply labeling to generated cards
    storyCards.forEach(card => {
      if (card.type === "character" && card.description &&
          (card.description.includes("Generated character") || card.description.includes("AI-generated"))) {
        // Ensure proper labeling
        if (!card.description.includes("[AI-GENERATED]")) {
          card.description = "[AI-GENERATED] " + card.description;
        }
      }
    });
  }
  }

  // If we found a player action and it's not a continue, add turn data to WTG Data storycard
  if (lastAction && actionType !== "continue") {
    // Extract action + first 2 sentences from AI response for better consistency
    const responseSnippet = extractFirstTwoSentences(modifiedText);

    // Add turn data to WTG Data storycard with generated entities and trigger mentions
    const timestamp = formatTurnTime(state.turnTime);
    addTurnData(actionType, lastAction.text, responseSnippet, timestamp, generatedEntities, triggerMentions, state.aiCommandThisTurn);

    // Clear the current turn triggers after adding to turn data
    if (state.currentTurnTriggers) {
      delete state.currentTurnTriggers;
    }
  }

  // Independent mention detection for timestamp injection on existing cards (even if generation disabled)
  if (!getWTGBooleanSetting("Disable WTG Entirely")) {
    const fullText = (lastAction ? lastAction.text : '') + ' ' + text;
    const recentHistoryText = history.slice(-5).map(h => h.text).join(' '); // Last 5 actions
    const scanText = fullText + ' ' + recentHistoryText;

    // Get existing character cards
    const existingCharacterCards = storyCards.filter(c => c.type === "character" && c.title && !hasTimestamp(c));
    const detectedCharacters = extractCharacterNames(scanText);
    for (const card of existingCharacterCards) {
      if (detectedCharacters.some(name => name.toLowerCase() === card.title.toLowerCase())) {
        addTimestampToCard(card, `${state.currentDate} ${state.currentTime}`);
      }
    }

    // Get existing location cards (use title matching)
    const existingLocationCards = storyCards.filter(c => (c.type === "location" || c.type === "place") && c.title && !hasTimestamp(c));
    for (const card of existingLocationCards) {
      const lowerTitle = card.title.toLowerCase();
      if (scanText.toLowerCase().includes(lowerTitle)) {
        addTimestampToCard(card, `${state.currentDate} ${state.currentTime}`);
      }
    }
  }
  
  // Check if we should update storycards with timestamps for newly mentioned elements
  if (lastAction) {
    // Update timestamp for Current Date and Time card
    const dateTimeCard = storyCards.find(card => card.title === "Current Date and Time");
    if (dateTimeCard) {
      addTimestampToCard(dateTimeCard, `${state.currentDate} ${state.currentTime}`);
    }
  }

  // Update the Current Date and Time storycard if needed
  if (state.changed || info.actionCount === 1 || info.actionCount % 5 === 0) {
    updateDateTimeCard();
    delete state.changed;
  }

  delete state.insertMarker;

  return {text: modifiedText};
};

modifier(text);
