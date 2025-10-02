// input.js - Handle user commands and process player actions for the new WTG implementation

const modifier = (text) => {
  // Ensure state.turnTime is always initialized
  state.turnTime = state.turnTime || {years:0, months:0, days:0, hours:0, minutes:0, seconds:0};

  // Check if WTG is disabled entirely
  if (getWTGBooleanSetting("Disable WTG Entirely")) {
    return {text: text};
  }

  // Initialize state if not present
  if (state.startingDate === undefined) {
    state.startingDate = '01/01/1900';
    state.startingTime = 'Unknown';
    state.currentDate = '01/01/1900';
    state.currentTime = 'Unknown';
    state.turnTime = {years:0, months:0, days:0, hours:0, minutes:0, seconds:0};
    state.timeMultiplier = 1.0; // Default time duration multiplier
  }

  state.changed = state.changed || false;
  state.insertMarker = false;

  // Initialize cooldown tracking for AI commands
  state.lastSleepTime = state.lastSleepTime || null;
  state.lastAdvanceTime = state.lastAdvanceTime || null;
  state.sleepWakeTime = state.sleepWakeTime || null;
  state.advanceEndTime = state.advanceEndTime || null;

  let modifiedText = text;
  let messages = [];

  // Check if user action is [sleep] command to trigger sleep
  if (text.trim().toLowerCase() === '[sleep]') {
    if (state.currentTime !== 'Unknown' && /\d/.test(state.currentTime)) {
      let sleepHours = Math.floor(Math.random() * 3) + 6;
      let sleepMinutes = Math.floor(Math.random() * 60);
      let add = {hours: sleepHours, minutes: sleepMinutes};
      state.turnTime = addToTurnTime(state.turnTime, add);
      const {currentDate, currentTime} = computeCurrent(state.startingDate, state.startingTime, state.turnTime);
      state.currentDate = currentDate;
      state.currentTime = currentTime;
      let wakeMessage = (add.days > 0 || state.turnTime.days > 0) ? "the next day" : "later that day";
      messages.push(`[You go to sleep and wake up ${wakeMessage} on ${state.currentDate} at ${state.currentTime}.]`);
    } else {
      state.turnTime = addToTurnTime(state.turnTime, {days: 1});
      const {currentDate, currentTime} = computeCurrent(state.startingDate, state.startingTime, state.turnTime);
      state.currentDate = currentDate;
      state.currentTime = "8:00 AM";
      messages.push(`[You go to sleep and wake up the next morning on ${state.currentDate}.]`);
    }
    state.insertMarker = true;
    state.changed = true;
    // Set sleep cooldown to prevent AI from sleeping again for 8 hours
    setSleepCooldown({hours: 8});
    modifiedText = '';
  }
  // Handle bracketed commands
  else {
    let trimmedText = text.trim();
    if (trimmedText.match(/^\[(.+?)\]$/)) {
      const commandStr = trimmedText.match(/^\[(.+?)\]$/)[1].trim().toLowerCase();
      const parts = commandStr.split(/\s+/);
      const command = parts[0];
      if (command === 'settime') {
        let dateStr = parts[1];
        let timeStr = parts.slice(2).join(' ');
        if (dateStr) {
          dateStr = dateStr.replace(/[.-]/g, '/');
          let [part1, part2, year] = dateStr.split('/').map(Number);
          if (year < 100) year += 2000;
          let month = part1;
          let day = part2;
          if (month > 12 && day <= 12) [month, day] = [day, part1];
          if (isValidDate(month, day, year)) {
            state.startingDate = `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}/${year}`;
            if (timeStr) {
              state.startingTime = normalizeTime(timeStr);
            }
            state.turnTime = {years:0, months:0, days:0, hours:0, minutes:0, seconds:0};
            const {currentDate, currentTime} = computeCurrent(state.startingDate, state.startingTime, state.turnTime);
            state.currentDate = currentDate;
            state.currentTime = currentTime;

            // Update timestamps in all existing storycards to reflect the new time
            updateAllStoryCardTimestamps(state.currentDate, state.currentTime);


            messages.push(`[Starting date and time set to ${state.startingDate} ${state.startingTime}.]`);
            state.insertMarker = true;
            state.changed = true;
            // Clear any existing AI command cooldowns when user resets time
            clearCommandCooldowns("user settime command");
          } else {
            messages.push(`[Invalid date: ${dateStr}. Use mm/dd/yyyy or dd/mm/yyyy.]`);
          }
        }
      } else if (command === 'advance') {
        if (state.startingTime === 'Unknown') {
          messages.push(`[Time advancement not applied as current time is descriptive (${state.startingTime}). Use [settime] to set a numeric time if needed.]`);
        } else {
          const amount = parseInt(parts[1], 10);
          const unit = parts[2] ? parts[2].toLowerCase() : 'hours';
          let extraMinutes = 0;
          if (parts[3] === 'minutes') {
            extraMinutes = parseInt(parts[4], 10) || 0;
          }
          let add = {minutes: extraMinutes};
          if (unit.startsWith('y')) {
            add.years = amount;
          } else if (unit.startsWith('m')) {
            add.months = amount;
          } else if (unit.startsWith('d')) {
            add.days = amount;
          } else {
            add.hours = amount;
          }
          state.turnTime = addToTurnTime(state.turnTime, add);
          const {currentDate, currentTime} = computeCurrent(state.startingDate, state.startingTime, state.turnTime);
          state.currentDate = currentDate;
          state.currentTime = currentTime;
          messages.push(`[Advanced ${amount} ${unit}${extraMinutes ? ` and ${extraMinutes} minutes` : ''}. New date/time: ${state.currentDate} ${state.currentTime}.]`);
          state.insertMarker = true;
          state.changed = true;
          // Set advance cooldown to prevent AI from advancing again for 5 minutes
          setAdvanceCooldown({minutes: 5});
        }
      } else if (command === 'reset') {
        let newDate = getCurrentDateFromHistory('', true);
        let newTime = getCurrentTimeFromHistory('', true);
        let valid = false;
        if (newDate) {
          let [part1, part2, year] = newDate.split('/').map(Number);
          if (year < 100) year += 2000;
          let month = part1;
          let day = part2;
          if (month > 12 && day <= 12) [month, day] = [day, part1];
          if (isValidDate(month, day, year)) {
            let tempCurrentDate = `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}/${year}`;
            let tempCurrentTime = newTime ? normalizeTime(newTime) : state.startingTime;
            state.turnTime = getDateDiff(state.startingDate, state.startingTime, tempCurrentDate, tempCurrentTime);
            state.currentDate = tempCurrentDate;
            state.currentTime = tempCurrentTime;

            // Update timestamps in all existing storycards to reflect the reset time
            updateAllStoryCardTimestamps(state.currentDate, state.currentTime);

            valid = true;
          }
        }
        if (valid) {
          messages.push(`[Date and time reset to most recent mention: ${state.currentDate} ${state.currentTime}.]`);
          state.insertMarker = true;
          state.changed = true;
          // Clear any existing AI command cooldowns when user resets time
          clearCommandCooldowns("user reset command");
        } else {
          messages.push(`[No date or time mentions found in history.]`);
        }
      } else {
        messages.push('[Invalid command. Available: settime, advance, reset, sleep.]');
      }
      modifiedText = '';
    }
  }

  // Add messages to modified text
  if (messages.length > 0) {
    modifiedText = messages.join('\n') + (modifiedText ? '\n' + modifiedText : '');
  }

  // Process entity markers in player input (always enabled)
  // Get the full input for storycard entries
  const fullInputText = text;

  // Blacklist for commands and pronouns
  const entityBlacklist = [
    'settime', 'advance', 'reset', 'sleep', 'help', 'status', 'time', 'date',
    'config', 'settings', 'debug', 'test', 'version', 'info', 'list', 'show',
    'clear', 'delete', 'remove', 'add', 'create', 'update', 'modify', 'change',
    'sleep', 'advance',
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

  const isBlacklisted = (entityName) => {
    const lowerName = entityName.toLowerCase().trim();
    // Check for exact match with blacklist (important for pronouns to avoid false positives)
    return entityBlacklist.some(item => lowerName === item);
  };

  const enableLocationCards = getWTGBooleanSetting("Enable Generated Location Cards");

  // Parse double-parentheses locations first
  if (enableLocationCards) {
  const doubleParenRegex = /(?<!\()\(\(([^)]+?)\)\)(?!\))/g;
  let doubleParenMatch;
  while ((doubleParenMatch = doubleParenRegex.exec(text)) !== null) {
    const entity = doubleParenMatch[1];
    if (entity.length >= 2) {
      const sanitized = sanitizeEntityName(entity);
      const title = normalizeNameCase(sanitized);

      // Skip if blacklisted
      if (isBlacklisted(title)) {
        continue;
      }

      const keys = normalizeKeysFor(title);
      const card = findOrCreateCard(title);
      if (card) {
        card.type = "location";
        card.keys = keys.join(',');
        // Always update entry with full input text
        card.entry = `Location: ${title}. First mentioned in player input: ${fullInputText}`;
        // Add timestamp if not present
        if (!hasTimestamp(card)) {
          addTimestampToCard(card, `${state.currentDate} ${state.currentTime}`);
        }
      }
    }
  }
  }

  // Parse single-parentheses characters
  const enableCharacterCards = getWTGBooleanSetting("Enable Generated Character Cards");
  if (enableCharacterCards) {
    const singleParenRegex = /(?<!\()\(([^)]+?)\)(?!\))/g;
    let singleParenMatch;
    while ((singleParenMatch = singleParenRegex.exec(text)) !== null) {
      const entity = singleParenMatch[1];
      if (entity.length >= 2) {
        const sanitized = sanitizeEntityName(entity);
        const title = normalizeNameCase(sanitized);

        // Skip if blacklisted
        if (isBlacklisted(title)) {
          continue;
        }

        const keys = normalizeKeysFor(title);
        const card = findOrCreateCard(title);
        if (card) {
          card.type = "character";
          card.keys = keys.join(',');
          // Always update entry with full input text
          card.entry = `Character: ${title}. First mentioned in player input: ${fullInputText}`;
          // Add timestamp if not present
          if (!hasTimestamp(card)) {
            addTimestampToCard(card, `${state.currentDate} ${state.currentTime}`);
          }
        }
      }
    }
  }

  // Debug mode: Show raw input with parentheses if enabled
  const debugMode = getWTGBooleanSetting("Debug Mode");
  if (debugMode) {
    // Keep parentheses in the text for debugging
  } else {
    // Strip all ((...)) and (...) from the input text for normal mode
    modifiedText = modifiedText.replace(/\(\(([^)]+?)\)\)/g, '$1');
    modifiedText = modifiedText.replace(/\(([^)]+?)\)/g, '$1');
  }

  
  // DISABLED: Automatic character name detection - cards are now only created from parentheses
  // const potentialNames = extractCharacterNames(text);
  // const newNames = potentialNames.filter(name => !hasStoryCardForName(name));
  // ... (rest of automatic detection code removed)

  // Detect triggers in player input and track mentions (only after proper time is set)
  if (text.trim() && !text.trim().match(/^\[(.+?)\]$/) && state.currentDate !== '01/01/1900' && state.currentTime !== 'Unknown') {
    // Skip command processing, scan the actual player input for triggers
    const inputText = text.toLowerCase();

    // Initialize trigger tracking for this turn if not exists
    if (!state.currentTurnTriggers) {
      state.currentTurnTriggers = [];
    }

    // Check all storycards for trigger matches in player input
    storyCards.forEach(card => {
      // Skip the WTG Data storycard, Current Date and Time card, and WTG Settings card (already handled)
      if (card.title === "WTG Data" || card.title === "Current Date and Time" || card.title === "World Time Generator Settings") {
        return;
      }

      // Check if this card has keys (triggers) and if any are mentioned in the input text
      if (card.keys && areCardTriggersMentioned(card, inputText)) {
        // Split the keys by comma to get individual triggers
        const triggers = card.keys.split(',').map(trigger => trigger.trim());

        // Check each trigger to see if it matches the input text
        for (const trigger of triggers) {
          const lowerTrigger = trigger.toLowerCase();

          // Check for exact match first
          if (inputText.includes(lowerTrigger)) {
            // Add to current turn triggers for turn data
            if (!state.currentTurnTriggers.includes(trigger)) {
              state.currentTurnTriggers.push(trigger);
            }
            break;
          }

          // Handle multi-word names: if there are two words or more in the trigger,
          // also check if the first word matches
          const triggerWords = lowerTrigger.split(/\s+/);
          if (triggerWords.length >= 2) {
            // Check if the first word of the multi-word trigger appears in the input text
            if (inputText.includes(triggerWords[0])) {
              // Add to current turn triggers for turn data
              if (!state.currentTurnTriggers.includes(trigger)) {
                state.currentTurnTriggers.push(trigger);
              }
              break;
            }
          }
        }
      }
    });
  }

  return {text: modifiedText};
};

modifier(text);