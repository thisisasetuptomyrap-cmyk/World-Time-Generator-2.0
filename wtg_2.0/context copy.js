// context.js - Handle context modifications and time adjustments for the new WTG implementation

const modifier = (text) => {
  // Ensure state.turnTime is always initialized
  state.turnTime = state.turnTime || {years:0, months:0, days:0, hours:0, minutes:0, seconds:0};

  // Get turn data from WTG Data storycard
  const turnData = getTurnData();
  
  // Handle adventure erasing based on action matching
  // Only run this logic if we have turn data and history
  if (turnData.length > 0 && history.length > 1) {
    // Get the most recent player action from history (excluding the current action)
    let previousAction = null;
    for (let i = history.length - 2; i >= 0; i--) {
      const action = history[i];
      if (action.type === "do" || action.type === "say" || action.type === "story") {
        previousAction = action;
        break;
      }
    }
    
    // If we found a previous player action, check for adventure erasing based on keyword matching
    if (previousAction) {
      const lastTurnData = turnData[turnData.length - 1];
      // Check if the action text matches
      if (previousAction.text !== lastTurnData.actionText) {
        // Check if there are any keyword matches in the current context before cleaning up
        const currentKeywords = extractKeywords(text);
        const lastKeywords = extractKeywords(lastTurnData.actionText + " " + lastTurnData.responseText);
        const keywordMatch = calculateKeywordSimilarity(lastKeywords, currentKeywords) > 0.1;

        // Only clean up if there are no keyword matches (indicating adventure erasing)
        if (!keywordMatch) {
          // Adventure erasing detected - clean up based on timestamps
          // Get the previous turn time from history
          const {lastTT} = getLastTurnTimeAndChars(history);

          // Mark all characters as not discovered at the start of the adventure
          markAllCharactersAsNotDiscovered();

          // Get currently active characters (those with storycards that are not marked as "not discovered")
          const currentCharacterNames = [];
          for (const card of storyCards) {
            // Skip system cards
            if (card.title === "WTG Data" || card.title === "Current Date and Time") {
              continue;
            }

            // Check if this is a generated character that is still discovered
            if (card.description && card.description.includes("Generated character") && !card.description.includes("Character not currently discovered")) {
              currentCharacterNames.push(card.title);
            }
          }

          // Clean up WTG Data card by removing entries for characters that are no longer detected
          cleanupWTGDataCardCharacters(currentCharacterNames);

          // Clean up character entries that were never actually discovered in the story
          cleanupUndiscoveredCharacters(currentCharacterNames);
        }
      }
    }
  }
  
  let modifiedText = text;
  
  // Get turn data again after potential cleanup
  const currentTurnData = getTurnData();
  
  // Get keywords from last two turns if available
  let lastKeywords = [];
  let secondLastKeywords = [];

  if (currentTurnData.length >= 1) {
    lastKeywords = extractKeywords(currentTurnData[currentTurnData.length - 1].actionText + " " + currentTurnData[currentTurnData.length - 1].responseText);
  }

  if (currentTurnData.length >= 2) {
    secondLastKeywords = extractKeywords(currentTurnData[currentTurnData.length - 2].actionText + " " + currentTurnData[currentTurnData.length - 2].responseText);
  }
  
  // Get keywords from current text
  const currentKeywords = extractKeywords(modifiedText);
  
  // Calculate similarity with last two turns
  const similarity1 = calculateKeywordSimilarity(lastKeywords, currentKeywords);
  const similarity2 = calculateKeywordSimilarity(secondLastKeywords, currentKeywords);
  
  // Get character count from history for time adjustment
  const {lastTT, charsAfter, found: markerFound} = getLastTurnTimeAndChars(history);

  // Check if lastTT came from the most recent action (which would be from a user command)
  // If the last action has [[turntime]], we should use it directly without adding more time
  let useLastTTDirectly = false;
  if (history.length > 0) {
    const lastActionText = history[history.length - 1].text;
    if (lastActionText.match(/\[\[(\d{2}y\d{2}m\d{2}d\d{2}h\d{2}n\d{2}s)\]\]/)) {
      useLastTTDirectly = true;
    }
  }

  let additionalMinutes = 0;

  if (useLastTTDirectly) {
    // User command provided exact timestamp - use it without modification
    state.turnTime = lastTT;
    const {currentDate, currentTime} = computeCurrent(state.startingDate || '01/01/1900', state.startingTime || 'Unknown', state.turnTime);
    state.currentDate = currentDate;
    state.currentTime = currentTime;
    state.changed = true;
  } else if (markerFound) {
    // A marker was found in history - use it as the base for time calculation
    // Get time duration multiplier from WTG Settings storycard
    let timeMultiplier = 1.0;
    const settingsCard = getWTGSettingsCard();
    if (settingsCard && settingsCard.entry) {
      const multiplierMatch = settingsCard.entry.match(/Time Duration Multiplier: ([\d.]+)/);
      if (multiplierMatch) {
        timeMultiplier = Math.max(0, parseFloat(multiplierMatch[1]) || 1.0);
      }
    }

    // Calculate additional minutes based on character count and time multiplier
    additionalMinutes = Math.floor((charsAfter / 700) * timeMultiplier);

    // Adjust time based on keyword similarity
    // If similarity is high, time passes more slowly
    // If similarity is low, time passes more quickly
    if (similarity1 > 0.3 || similarity2 > 0.3) {
      // High similarity - slow time passage
      additionalMinutes = Math.max(1, Math.floor(additionalMinutes * 0.7));
    } else if (similarity1 < 0.1 && similarity2 < 0.1) {
      // Low similarity - fast time passage
      additionalMinutes = Math.floor(additionalMinutes * 1.3);
    }

    // Update turn time
    if (additionalMinutes > 0) {
      state.turnTime = addToTurnTime(lastTT, {minutes: additionalMinutes});
      state.changed = true;
    } else {
      state.turnTime = lastTT;
    }
    const {currentDate, currentTime} = computeCurrent(state.startingDate || '01/01/1900', state.startingTime || 'Unknown', state.turnTime);
    state.currentDate = currentDate;
    state.currentTime = currentTime;
  } else {
    // No marker found in history - preserve existing state.turnTime
    // Only add time based on character count if we have a valid starting time
    if (state.turnTime && state.startingTime !== 'Unknown') {
      // Get time duration multiplier from WTG Settings storycard
      let timeMultiplier = 1.0;
      const settingsCard = getWTGSettingsCard();
      if (settingsCard && settingsCard.entry) {
        const multiplierMatch = settingsCard.entry.match(/Time Duration Multiplier: ([\d.]+)/);
        if (multiplierMatch) {
          timeMultiplier = Math.max(0, parseFloat(multiplierMatch[1]) || 1.0);
        }
      }

      additionalMinutes = Math.floor((charsAfter / 700) * timeMultiplier);

      // Adjust time based on keyword similarity
      if (similarity1 > 0.3 || similarity2 > 0.3) {
        additionalMinutes = Math.max(1, Math.floor(additionalMinutes * 0.7));
      } else if (similarity1 < 0.1 && similarity2 < 0.1) {
        additionalMinutes = Math.floor(additionalMinutes * 1.3);
      }

      if (additionalMinutes > 0) {
        state.turnTime = addToTurnTime(state.turnTime, {minutes: additionalMinutes});
        const {currentDate, currentTime} = computeCurrent(state.startingDate || '01/01/1900', state.startingTime || 'Unknown', state.turnTime);
        state.currentDate = currentDate;
        state.currentTime = currentTime;
        state.changed = true;
      }
    }
    // If state.turnTime doesn't exist, leave currentDate/currentTime unchanged
  }
  
  // Clean up WTG Data card by removing entries with timestamps higher than current turn time
  cleanupWTGDataCardByTimestamp(state.turnTime);

  // Clean up storycards with "Discovered on" timestamps higher than current time
  cleanupStoryCardsByTimestamp(state.currentDate, state.currentTime);

  // Deprecate generated storycards that are no longer detected in the current story
  // Only run if card deletion is NOT disabled (false means depreciation is enabled)
  const disableCardDeletion = getWTGBooleanSetting("Disable Generated Card Deletion");
  if (!disableCardDeletion) {
    const currentDetectedEntities = new Set();

    // Extract entities from current text
    const textEntities = extractCharacterNames(text);
    textEntities.forEach(name => currentDetectedEntities.add(name.toLowerCase()));

    // Extract entities from recent history (last 5 actions)
    for (let i = Math.max(0, history.length - 5); i < history.length; i++) {
      const actionEntities = extractCharacterNames(history[i].text);
      actionEntities.forEach(name => currentDetectedEntities.add(name.toLowerCase()));
    }

    // Check all storycards for generated entities that are no longer detected
    storyCards.forEach(card => {
      if (card.title === "WTG Data" || card.title === "Current Date and Time" || card.title === "World Time Generator Settings") {
        return;
      }

      if (card.description && (card.description.includes("Generated character") || card.description.includes("Generated location"))) {
        if (!currentDetectedEntities.has(card.title.toLowerCase())) {
          // Deprecate the card
          card.type = "deprecated";
          card.description = (card.description || "") + "\n[DEPRECATED: Entity no longer detected in current story]";
          if (card.keys) {
            card.keys = "";
          }
          // Remove timestamp
          card.entry = card.entry.replace(/\n\n[A-Z][a-z]+ on \d{1,2}\/\d{1,2}\/\d{4} \d{1,2}:\d{2} [AP]M/, '');
        }
      }
    });
  }

  state.insertMarker = (charsAfter >= 7000);

  // Check for pending AI commands that should be applied
  checkAndApplyPendingCommands();

   // Add instructions to context
  let instructions = `\nMessages enclosed in [ ] are system notifications generated by the scripting system. Incorporate any relevant information from them (such as date or time updates) into your narrative naturally if appropriate, but do not replicate, reference, alter, or generate similar bracketed messages in your response. Treat them as out-of-story metadata.\nIgnore any text enclosed in [[ and ]]. It is system metadata, do not reference, alter, or generate similar.

[IMPORTANT FORMATTING RULES - ALWAYS FOLLOW]
When introducing or mentioning ANY character (person, creature, NPC):
- REQUIRED: Format their name in single parentheses on first mention: (CharacterName)
- Example: "A warrior named (Marcus) approached" or "(The Innkeeper) greeted you"

When introducing or mentioning ANY location (place, building, area):
- REQUIRED: Format the location in double parentheses on first mention: ((LocationName))
- Example: "You entered ((The Golden Tavern))" or "The path led to ((Silverwood Forest))"

Additional formatting:
- For important character details: (((CharacterName) description text)))
- For important location details: (((LocationName) description text)))
- These parentheses are invisible to the user and enable automatic storycard generation
- You MUST use this formatting every time - it is critical for the game system to function

[END FORMATTING RULES]`;

  // Add LLM time commands instructions if Dynamic Time is enabled
  if (getWTGBooleanSetting("Enable Dynamic Time")) {
    let sleepInstruction = "When the user decides to sleep on the previous turn, start the action with (sleep X units) where X is a number and units can be hours, minutes, days, weeks, months, or years.";
    let advanceInstruction = "When a notable chunk of time passes in the adventure, start the action with (advance X units) using the same format.";

    instructions += `\n\n<scratchpad>
${sleepInstruction} ${advanceInstruction}
</scratchpad>`;
  }

  
  // Add current date and time to context
  const dateTimeInjection = `\nCurrent date: ${state.currentDate}; Current time: ${state.currentTime}`;

  return {text: modifiedText + instructions + dateTimeInjection};
};

modifier(text);