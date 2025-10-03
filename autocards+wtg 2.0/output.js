// output.js - Combined WTG 2.0 Lightweight + AutoCards output processing
// WTG runs first for time consistency, then AutoCards processes the result

const modifier = (text) => {
  // ============ WTG PROCESSING FIRST ============
  // Ensure state.turnTime is always initialized
  state.turnTime = state.turnTime || {years:0, months:0, days:0, hours:0, minutes:0, seconds:0};

  let modifiedText = text;

  if (state.startingDate === '01/01/1900') {
    modifiedText = ' Please switch to story mode and use the command, [settime mm/dd/yyyy time] to set a custom starting date and time. (eg: [settime 01/01/1900 12:00 am])\n\nTo report bugs, message me on discord: thedenial. (it has a period at the end of it)';
    return {text: modifiedText};
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
    // Update timestamp for Current Date and Time card
    const dateTimeCard = storyCards.find(card => card.title === "Current Date and Time");
    if (dateTimeCard) {
      addTimestampToCard(dateTimeCard, `${state.currentDate} ${state.currentTime}`);
    }

    // Add timestamps to all storycards that don't have them (except system cards)
    for (let i = 0; i < storyCards.length; i++) {
      const card = storyCards[i];

      // Skip system cards
      if (card.title === "WTG Data" || card.title === "Current Date and Time") {
        continue;
      }

      // Add timestamp if card doesn't have one
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

  // ============ AUTOCARDS PROCESSING SECOND ============
  modifiedText = AutoCards("output", modifiedText);

  return {text: modifiedText};
};

modifier(text);
