// context.js - Combined WTG 2.0 Lightweight + AutoCards context processing
// WTG runs first for time consistency, then AutoCards processes the result

const modifier = (text) => {
  // ============ WTG PROCESSING FIRST ============
  // Ensure state.turnTime is always initialized
  state.turnTime = state.turnTime || {years:0, months:0, days:0, hours:0, minutes:0, seconds:0};

  let modifiedText = text;

  // Get turn data from WTG Data storycard
  const turnData = getTurnData();

  // Handle adventure erasing based on action matching
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

    // If we found a previous player action, check for adventure erasing
    if (previousAction) {
      const lastTurnData = turnData[turnData.length - 1];
      // If the action text doesn't match, adventure erasing was detected
      if (previousAction.text !== lastTurnData.actionText) {
        // Get the previous turn time from history
        const {lastTT} = getLastTurnTimeAndChars(history);
        // Don't clean up if lastTT is zero (no turn time marker found)
        if (lastTT.years > 0 || lastTT.months > 0 || lastTT.days > 0 || lastTT.hours > 0 || lastTT.minutes > 0 || lastTT.seconds > 0) {
          // Clean up WTG Data by removing future turn data
          cleanupWTGDataCardByTimestamp(lastTT);
        }
      }
    }
  }

  // Get turn data again after potential cleanup
  const currentTurnData = getTurnData();
  
  // Get keywords from last two turns if available (for dynamic time)
  let lastKeywords = [];
  let secondLastKeywords = [];

  if (currentTurnData.length >= 1) {
    lastKeywords = extractKeywords(currentTurnData[currentTurnData.length - 1].actionText + " " + (currentTurnData[currentTurnData.length - 1].responseText || ''));
  }

  if (currentTurnData.length >= 2) {
    secondLastKeywords = extractKeywords(currentTurnData[currentTurnData.length - 2].actionText + " " + (currentTurnData[currentTurnData.length - 2].responseText || ''));
  }
  
  // Get keywords from current text
  const currentKeywords = extractKeywords(modifiedText);
  
  // Calculate similarity with last two turns
  const similarity1 = calculateKeywordSimilarity(lastKeywords, currentKeywords);
  const similarity2 = calculateKeywordSimilarity(secondLastKeywords, currentKeywords);

  // Get character count from history for time adjustment
  const {lastTT, charsAfter} = getLastTurnTimeAndChars(history);

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
  } else {
    // Calculate additional minutes based on character count (fixed rate: 1 minute per 700 characters)
    additionalMinutes = Math.floor(charsAfter / 700);

    // Apply dynamic time if enabled
    if (getWTGBooleanSetting("Enable Dynamic Time")) {
      // Adjust time based on keyword similarity
      // If similarity is high, time passes more slowly
      // If similarity is low, time passes more quickly
      if (similarity1 > 0.3 || similarity2 > 0.3) {
        // High similarity - slow time passage (dialogue/stationary scenes)
        additionalMinutes = Math.max(1, Math.floor(additionalMinutes * 0.7));
      } else if (similarity1 < 0.1 && similarity2 < 0.1) {
        // Low similarity - fast time passage (scene changes, travel)
        additionalMinutes = Math.floor(additionalMinutes * 1.3);
      }
    }

    // Update turn time
    if (additionalMinutes > 0) {
      state.turnTime = addToTurnTime(lastTT, {minutes: additionalMinutes});
      const {currentDate, currentTime} = computeCurrent(state.startingDate || '01/01/1900', state.startingTime || 'Unknown', state.turnTime);
      state.currentDate = currentDate;
      state.currentTime = currentTime;
      state.changed = true;
    } else {
      state.turnTime = lastTT;
      const {currentDate, currentTime} = computeCurrent(state.startingDate || '01/01/1900', state.startingTime || 'Unknown', state.turnTime);
      state.currentDate = currentDate;
      state.currentTime = currentTime;
    }
  }

  modifiedText += `\nDo not recreate or reference any system commands such as [settime], [advance], [reset], (sleep ...), or (advance ...). Only emit (sleep ...)/(advance ...) when explicitly instructed in the scratchpad and never describe these commands to the user.`;

  // Clean up WTG Data card by removing entries with timestamps higher than current turn time
  cleanupWTGDataCardByTimestamp(state.turnTime);

  // Clean up storycards with future timestamps
  cleanupStoryCardsByTimestamp(state.currentDate, state.currentTime);

  state.insertMarker = (charsAfter >= 7000);

  let instructions = `\nDo not recreate or reference any system commands such as [settime], [advance], [reset], (sleep ...), or (advance ...). Only emit (sleep ...)/(advance ...) when explicitly instructed in the scratchpad and never describe these commands to the user.`;

  // Add scratchpad with AI command instructions if Dynamic Time is enabled
  if (getWTGBooleanSetting("Enable Dynamic Time")) {
    let sleepInstruction = "When the user decides to sleep on the previous turn, start the action with (sleep X units) where X is a number and units can be hours, minutes, days, weeks, months, or years.";
    let advanceInstruction = "When a notable chunk of time passes in the adventure, start the action with (advance X units) using the same format.";

    instructions += `\n\n<scratchpad>
${sleepInstruction} ${advanceInstruction}
</scratchpad>`;
  }

  modifiedText += instructions;

  // Add current date and time to context
  const dateTimeInjection = `\nCurrent date: ${state.currentDate}; Current time: ${state.currentTime}`;
  modifiedText = modifiedText + dateTimeInjection;

  // ============ AUTOCARDS PROCESSING SECOND ============
  [text, stop] = AutoCards("context", modifiedText, stop);

  return {text, stop};
};

modifier(text);
