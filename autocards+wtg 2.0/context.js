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

  // Get character count from history for time adjustment
  const {lastTT, charsAfter} = getLastTurnTimeAndChars(history);

  // Calculate additional minutes based on character count (fixed rate: 1 minute per 700 characters)
  let additionalMinutes = Math.floor(charsAfter / 700);

  // Update turn time
  state.turnTime = addToTurnTime(lastTT, {minutes: additionalMinutes});
  const {currentDate, currentTime} = computeCurrent(state.startingDate || '01/01/1900', state.startingTime || 'Unknown', state.turnTime);
  state.currentDate = currentDate;
  state.currentTime = currentTime;

  if (additionalMinutes > 0) {
    state.changed = true;
  }

  // Clean up WTG Data card by removing entries with timestamps higher than current turn time
  cleanupWTGDataCardByTimestamp(state.turnTime);

  // Clean up storycards with future timestamps
  cleanupStoryCardsByTimestamp(state.currentDate, state.currentTime);

  state.insertMarker = (charsAfter >= 7000);

  // Add current date and time to context
  const dateTimeInjection = `\nCurrent date: ${state.currentDate}; Current time: ${state.currentTime}`;
  modifiedText = modifiedText + dateTimeInjection;

  // ============ AUTOCARDS PROCESSING SECOND ============
  [text, stop] = AutoCards("context", modifiedText, stop);

  return {text, stop};
};

modifier(text);
