// output.js - Handle AI responses and update storycards for WTG with mode switching

const modifier = (text) => {
  // Ensure state.turnTime is always initialized
  state.turnTime = state.turnTime || {years:0, months:0, days:0, hours:0, minutes:0, seconds:0};

  // Initialize mode if not set (default to lightweight)
  if (!state.wtgMode) {
    state.wtgMode = 'lightweight';
  }

  let modifiedText = text;

  // Check if WTG is disabled entirely (Normal mode only)
  if (!isLightweightMode() && getWTGBooleanSetting("Disable WTG Entirely")) {
    return {text: text};
  }

  // Initial prompt when no starting date is set
  if (state.startingDate === '01/01/1900') {
    modifiedText = ' Please switch to story mode and use the command, [settime mm/dd/yyyy time] to set a custom starting date and time. (eg: [settime 01/01/1900 12:00 am])\n\nTo enable all of the features, use the command [normal]. You can go back to lightweight mode by using the command [light].\n\nLightweight mode is recommended for free users and llama models, as normal mode relies on the model\'s instruction following to generate characters and locations.  \n\nTo report bugs, message me on discord: thedenial. (it has a period at the end of it)';
    return {text: modifiedText};
  }

  // ========================================================================
  // LIGHTWEIGHT MODE
  // ========================================================================
  if (isLightweightMode()) {
    // Get the last action from history to determine action type
    let lastAction = null;
    let actionType = "continue";
    
    for (let i = history.length - 1; i >= 0; i--) {
      const action = history[i];
      if (action.type === "do" || action.type === "say" || action.type === "story") {
        lastAction = action;
        actionType = action.type;
        break;
      }
    }

    // Process any existing turn time marker in the text
    const ttMatch = modifiedText.match(/\[\[(.*?)\]\]$/);
    let parsedTT = ttMatch ? parseTurnTime(ttMatch[1]) : null;
    let narrative = ttMatch ? modifiedText.replace(/\[\[.*\]\]$/, '').trim() : modifiedText.trim();
    let charCount = narrative.length;

    // Calculate minutes to add based on character count (fixed rate: 1 minute per 700 characters)
    let minutesToAdd = Math.floor(charCount / 700);

    // Add warning if AI altered turn time metadata
    if (parsedTT) {
      const currentTTForm = formatTurnTime(state.turnTime);
      if (ttMatch[1] !== currentTTForm) {
        modifiedText += '\n[Warning: Turn time metadata altered by AI. Please retry.]';
      }
    }

    // Update turn time based on character count if starting time is not descriptive
    if (state.startingTime !== 'Unknown' && minutesToAdd > 0) {
      state.turnTime = addToTurnTime(state.turnTime, {minutes: minutesToAdd});
      const {currentDate, currentTime} = computeCurrent(state.startingDate, state.startingTime, state.turnTime);
      state.currentDate = currentDate;
      state.currentTime = currentTime;
    state.changed = true;
  }

  // Update text without turn time marker
  modifiedText = narrative;

    // Add timestamps to existing storycards that don't have them
    if (lastAction && state.currentDate !== '01/01/1900' && state.currentTime !== 'Unknown') {
      const dateTimeCard = storyCards.find(card => card.title === "Current Date and Time");
      if (dateTimeCard) {
        addTimestampToCard(dateTimeCard, `${state.currentDate} ${state.currentTime}`);
      }

      for (let i = 0; i < storyCards.length; i++) {
        const card = storyCards[i];
        // Skip system cards
        if (card.title === "WTG Data" || card.title === "Current Date and Time" || card.title === "World Time Generator Settings" || card.title === "WTG Cooldowns") {
          continue;
        }
        if (card.entry && !hasTimestamp(card)) {
          addTimestampToCard(card, `${state.currentDate} ${state.currentTime}`);
        }
      }
    }

    // Add turn data to WTG Data storycard if we found a player action and it's not a continue
    if (lastAction && actionType !== "continue") {
      const timestamp = formatTurnTime(state.turnTime);
      addTurnData(actionType, lastAction.text, timestamp);
    }

    // Update the Current Date and Time storycard if needed
    if (state.changed || info.actionCount === 1 || info.actionCount % 5 === 0) {
      updateDateTimeCard();
      delete state.changed;
    }

    delete state.insertMarker;

    return {text: modifiedText};
  }

  // ========================================================================
  // NORMAL MODE
  // ========================================================================

  // Update storycard entries for characters detected in the previous turn
  if (state.pendingCharacterEntries) {
    let lastAction = null;
    for (let i = history.length - 1; i >= 0; i--) {
      const action = history[i];
      if (action.type === "do" || action.type === "say" || action.type === "story") {
        lastAction = action;
        break;
      }
    }
    
    if (lastAction) {
      const entryText = lastAction.text;
      let allProcessed = true;
      for (const name in state.pendingCharacterEntries) {
        if (state.pendingCharacterEntries[name]) {
          const card = storyCards.find(c => c.title === name);
          if (card) {
            card.entry = entryText.substring(0, 200) + (entryText.length > 200 ? '...' : '');
          }
          state.pendingCharacterEntries[name] = false;
        }
        if (state.pendingCharacterEntries[name]) {
          allProcessed = false;
        }
      }
      if (allProcessed) {
        delete state.pendingCharacterEntries;
      }
    }
  }

  // Get the last action from history to determine action type
  let lastAction = null;
  let actionType = "continue";
  
  for (let i = history.length - 1; i >= 0; i--) {
    const action = history[i];
    if (action.type === "do" || action.type === "say" || action.type === "story") {
      lastAction = action;
      actionType = action.type;
      break;
    }
  }
  
  let generatedEntities = [];

  // ========================================================================
  // ENTITY DETECTION AND STORYCARD CREATION (NORMAL MODE)
  // ========================================================================
  {
    let fullTurnOutput = "";
    if (lastAction) {
      fullTurnOutput = `Player: ${lastAction.text}\nAI: ${text}`;
    } else {
      fullTurnOutput = text;
    }

    const commandBlacklist = [
      'settime', 'advance', 'reset', 'sleep', 'help', 'status', 'time', 'date',
      'config', 'settings', 'debug', 'test', 'version', 'info', 'list', 'show',
      'clear', 'delete', 'remove', 'add', 'create', 'update', 'modify', 'change',
      'sleep', 'advance', 'light', 'normal',
      // Personal pronouns
      'i', 'me', 'my', 'mine', 'myself',
      'you', 'your', 'yours', 'yourself', 'yourselves',
      'he', 'him', 'his', 'himself',
      'she', 'her', 'hers', 'herself',
      'it', 'its', 'itself',
      'we', 'us', 'our', 'ours', 'ourselves',
      'they', 'them', 'their', 'theirs', 'themselves',
      // Demonstrative pronouns
      'this', 'that', 'these', 'those',
      // Relative pronouns
      'who', 'whom', 'whose', 'which', 'what',
      // Indefinite pronouns
      'someone', 'somebody', 'something', 'somewhere',
      'anyone', 'anybody', 'anything', 'anywhere',
      'everyone', 'everybody', 'everything', 'everywhere',
      'no one', 'nobody', 'nothing', 'nowhere',
      'one', 'ones', 'other', 'others', 'another',
      'each', 'every', 'either', 'neither', 'both', 'all', 'some', 'any', 'none',
      'few', 'many', 'several', 'much', 'more', 'most', 'less', 'least',
      // Interrogative pronouns
      'whoever', 'whomever', 'whatever', 'whichever'
    ];

    const isBlacklistedCommand = (entityName) => {
      const lowerName = entityName.toLowerCase().trim();
      // Check for exact match with blacklist (important for pronouns to avoid false positives)
      return commandBlacklist.some(cmd => lowerName === cmd);
    };

    const isDuplicateEntityName = (newName, existingCards) => {
      const newNameLower = newName.toLowerCase().trim();
      const newNameWords = newNameLower.split(/\s+/);

      for (const card of existingCards) {
        const existingNameLower = card.title.toLowerCase().trim();
        const existingNameWords = existingNameLower.split(/\s+/);

        if (existingNameLower.includes(newNameLower)) {
          return { isDuplicate: true, existingCard: card };
        }

        if (newNameLower.includes(existingNameLower)) {
          return { isDuplicate: true, existingCard: card };
        }

        const commonWords = newNameWords.filter(word =>
          existingNameWords.some(existingWord =>
            existingWord.includes(word) || word.includes(existingWord)
          )
        );

        if (commonWords.length > 0 && (commonWords.length / Math.max(newNameWords.length, existingNameWords.length)) > 0.5) {
          return { isDuplicate: true, existingCard: card };
        }
      }

      return { isDuplicate: false, existingCard: null };
    };

    const extractContextualSentences = (text, entityName, sentencesBefore = 2, sentencesAfter = 2) => {
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
      const entityIndex = sentences.findIndex(sentence =>
        sentence.toLowerCase().includes(entityName.toLowerCase())
      );

      if (entityIndex === -1) {
        return text.substring(0, 300) + (text.length > 300 ? '...' : '');
      }

      const startIndex = Math.max(0, entityIndex - sentencesBefore);
      const endIndex = Math.min(sentences.length - 1, entityIndex + sentencesAfter);
      const contextualSentences = sentences.slice(startIndex, endIndex + 1);

      return contextualSentences.join('. ').trim() + '.';
    };

    generatedEntities = [];
    const existingEntities = [];

    // Parse double-parentheses locations
    const enableLocationCards = getWTGBooleanSetting("Enable Generated Location Cards");
    if (enableLocationCards) {
      const doubleParenRegex = /(?<!\()(\(\()([^\(\)]+?)(\)\))(?!\))/g;
      let doubleParenMatch;
      while ((doubleParenMatch = doubleParenRegex.exec(text)) !== null) {
        const entity = doubleParenMatch[2];
        if (entity.length >= 2) {
          const sanitized = sanitizeEntityName(entity);
          const title = normalizeNameCase(sanitized);

          if (isBlacklistedCommand(title)) {
            continue;
          }

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
        const entity = singleParenMatch[2];
        if (entity.length >= 2) {
          const sanitized = sanitizeEntityName(entity);
          const title = normalizeNameCase(sanitized);

          if (isBlacklistedCommand(title)) {
            continue;
          }

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

      const discoveryCard = findOrCreateCard(discoveryCardTitle);
      if (discoveryCard) {
        discoveryCard.type = "discovery";
        discoveryCard.keys = entityNames.join(',');
        discoveryCard.entry = fullTurnOutput;

        if (!hasTimestamp(discoveryCard)) {
          addTimestampToCard(discoveryCard, `${state.currentDate} ${state.currentTime}`, true);
        }
      }

      for (const entity of generatedEntities) {
        const keys = normalizeKeysFor(entity.name);
        const card = findOrCreateCard(entity.name);
        if (card) {
          card.type = entity.type;
          card.keys = keys.join(',');
          card.entry = `Discovered in: ${discoveryCardTitle}`;
          if (!hasTimestamp(card)) {
            addTimestampToCard(card, `${state.currentDate} ${state.currentTime}`, true);
          }
        }
      }
    } else if (generatedEntities.length === 1) {
      const entity = generatedEntities[0];
      const keys = normalizeKeysFor(entity.name);
      const card = findOrCreateCard(entity.name);
      if (card) {
        card.type = entity.type;
        card.keys = keys.join(',');
        card.entry = extractContextualSentences(text, entity.name, 2, 2);
        if (!hasTimestamp(card)) {
          addTimestampToCard(card, `${state.currentDate} ${state.currentTime}`, true);
        }
      }
    }

    for (const entity of existingEntities) {
      if (!hasTimestamp(entity.card)) {
        addTimestampToCard(entity.card, `${state.currentDate} ${state.currentTime}`);
      }
    }

    // Parse triple-parentheses descriptions and inject into storycards
    const tripleParenRegex = /(?<!\()(\(\(\()([^\(\)]+?)(\)\)\))(?!\))/g;
    let tripleParenMatch;
    while ((tripleParenMatch = tripleParenRegex.exec(text)) !== null) {
      const content = tripleParenMatch[2];
      const entityDescMatch = content.match(/^(\([^()]+\)|\(\([^()]+\)\))\s+(.+)$/);
      if (entityDescMatch) {
        const entityPart = entityDescMatch[1];
        const description = entityDescMatch[2];

        let entityName = '';
        let entityType = '';

        if (entityPart.startsWith('((') && entityPart.endsWith('))')) {
          entityName = entityPart.substring(2, entityPart.length - 2);
          entityType = 'location';
        } else if (entityPart.startsWith('(') && entityPart.endsWith(')')) {
          entityName = entityPart.substring(1, entityPart.length - 1);
          entityType = 'character';
        }

        if (entityName) {
          const sanitizedName = sanitizeEntityName(entityName);
          const titleCaseName = normalizeNameCase(sanitizedName);
          const card = storyCards.find(c => c.title && c.title.toLowerCase() === titleCaseName.toLowerCase());

          if (card) {
            if (card.entry && !card.entry.includes(description)) {
              card.entry += `\n\n${description}`;
            }
          }
        }
      }
    }
  }

  // ========================================================================
  // TIME COMMANDS DETECTION (NORMAL MODE)
  // ========================================================================
  
  let leadingCommandDetected = false;
  const leadingCommandMatch = modifiedText.match(/^\s*\((sleep|advance)\s+(\d+)\s+(\w+)\)/i);
  
  if (leadingCommandMatch) {
    leadingCommandDetected = true;
    const commandType = leadingCommandMatch[1].toLowerCase();
    const amount = parseInt(leadingCommandMatch[2], 10);
    const unit = leadingCommandMatch[3].toLowerCase();

    const shouldProcessCommand = !(
      (commandType === 'sleep' && isSleepCooldownActive()) ||
      (commandType === 'advance' && isAdvanceCooldownActive())
    );

    if (shouldProcessCommand) {
      let days = 0, hours = 0, minutes = 0;
      switch (unit) {
        case 'years': case 'year': days = amount * 365; break;
        case 'months': case 'month': days = amount * 30; break;
        case 'weeks': case 'week': days = amount * 7; break;
        case 'days': case 'day': days = amount; break;
        case 'hours': case 'hour': hours = amount; break;
        case 'minutes': case 'minute': minutes = amount; break;
      }

      if (days > 0 || hours > 0 || minutes > 0) {
        state.turnTime = addToTurnTime(state.turnTime, { days, hours, minutes });
        const { currentDate, currentTime } = computeCurrent(state.startingDate, state.startingTime, state.turnTime);
        state.currentDate = currentDate;
        state.currentTime = currentTime;
        state.changed = true;

        if (commandType === 'sleep') {
          setSleepCooldown({hours: 8});
          state.aiCommandThisTurn = `sleep ${amount} ${unit}`;
        } else {
          setAdvanceCooldown({minutes: 5});
          state.aiCommandThisTurn = `advance ${amount} ${unit}`;
        }
      }
    }
  }

  // Remove commands if cooldown is active or debug mode is false
  const shouldRemoveAllCommands = !getWTGBooleanSetting("Debug Mode") || isSleepCooldownActive() || isAdvanceCooldownActive();
  
  if (leadingCommandDetected) {
    modifiedText = modifiedText.replace(/^\s*\((sleep|advance)\s+\d+\s+\w+\)\s*/i, '');
  }

  if (shouldRemoveAllCommands) {
    modifiedText = modifiedText.replace(/\(sleep\s+\d+\s+\w+\)/gi, '');
    modifiedText = modifiedText.replace(/\(advance\s+\d+\s+\w+\)/gi, '');
  }

  // Strip parentheses for display (unless debug mode is enabled)
  const debugMode = getWTGBooleanSetting("Debug Mode");
  if (!debugMode) {
    // First pass: Triple parentheses - extract entity name
    modifiedText = modifiedText.replace(/\(\(\(.*?\)\)\)/gs, function(match) {
      const innerMatch = match.match(/\(\(\(([^)]+?)\)/);
      return innerMatch ? innerMatch[1] : '';
    });

    // Second pass: Double parentheses - keep location name
    modifiedText = modifiedText.replace(/\(\(([^)]+?)\)\)/g, '$1');

    // Third pass: Single parentheses - keep character name
    modifiedText = modifiedText.replace(/\((?!(?:sleep|advance)\s)([^)]+?)\)/g, '$1');
  }

  // Add turn data record
  if (lastAction && actionType !== "continue") {
    const timestamp = formatTurnTime(state.turnTime);
    const firstTwoSentences = text.match(/^[^.!?]*[.!?][^.!?]*[.!?]/) || [''];
    const responseText = firstTwoSentences[0].trim();
    const triggerMentions = state.currentTurnTriggers ? state.currentTurnTriggers.map(trigger => ({
      cardTitle: 'Unknown',
      trigger: trigger
    })) : [];
    const aiCommand = state.aiCommandThisTurn || null;
    addTurnData(actionType, lastAction.text, timestamp, responseText, generatedEntities, triggerMentions, aiCommand);
    delete state.aiCommandThisTurn;
  }

  state.currentTurnTriggers = [];

  // Add timestamps to all storycards that don't have them
  if (lastAction && state.currentDate !== '01/01/1900' && state.currentTime !== 'Unknown') {
    for (let i = 0; i < storyCards.length; i++) {
      const card = storyCards[i];
      if (card.title === "WTG Data" || card.title === "Current Date and Time" || card.title === "World Time Generator Settings" || card.title === "WTG Cooldowns") {
        continue;
      }
      if (card.entry && !hasTimestamp(card)) {
        addTimestampToCard(card, `${state.currentDate} ${state.currentTime}`);
      }
    }
  }

  // Update the Current Date and Time storycard if needed
  if (state.changed || info.actionCount === 1 || info.actionCount % 5 === 0) {
    updateDateTimeCard();
    delete state.changed;
  }

  // Insert turn time marker if needed
  if (state.insertMarker) {
    const ttForm = formatTurnTime(state.turnTime);
    modifiedText += ` [[${ttForm}]]`;
  }

  delete state.insertMarker;

  return {text: modifiedText};
};

modifier(text);

