# WTG 2.0 Lightweight + AutoCards Combined System

## Version: 1.0.7 Combined
Date: 2025-10-30

## Version History

### Version 1.0.7 (2025-10-30)
**Feature: Automatic Leading Space Injection**

**New Feature Added**:
A new utility function `ensureLeadingSpace()` has been added to automatically inject a leading space at the beginning of action text if one isn't already present.

**Purpose**:
- Ensures consistent formatting of AI responses in scenarios
- Prevents formatting issues when actions don't naturally start with a space
- Ensures space is preserved after system messages and commands on following turns
- Applied to ALL output paths (all return statements)

**Implementation**:
- **Function Location**: `library.js` (WTG section, lines 893-911, before AutoCards)
- **Function Name**: `ensureLeadingSpace(actionText)`
- **Integration Points**: `output.js` 
  - Line ~59: Applied to initial settime system message
  - Line ~242: Applied to final output (after AutoCards processing)
- **Logic**: 
  - Checks if input string is valid (non-null, non-empty, string type)
  - Returns unchanged if text already starts with space
  - Prepends single space character if not present

**Files Modified**:
- `library.js`: Added ensureLeadingSpace() function
- `output.js`: Integrated function call in all output return paths

**Impact**:
- All AI responses now consistently start with a leading space
- Prevents formatting inconsistencies after system messages and commands
- Ensures proper spacing on turns following command execution
- Works seamlessly with AutoCards processing

**Backup Created**: `Backup/autocards+wtg_2.0_1.0.7_leading_space_injection_2025-10-30/`

---

### Version 1.0.6 (2025-10-29)
**Bug Fix: Back-to-Back Commands Time Addition**

**Issue Fixed**:
When using two commands back-to-back (e.g., `[sleep]` followed by `[advance]`), the second command was not properly adding time to the first command's result. Instead of accumulating time (e.g., 7h52m + 2h = 9h52m), the second command would reset to just the amount specified (2h03m).

**Root Cause**:
In `library.js` (line 530) and `context.js` (line 72), the regex patterns used to extract turn time markers from history had a `$` anchor at the end:
```javascript
actionText.match(/\[\[(\d{2}y\d{2}m\d{2}d\d{2}h\d{2}n\d{2}s)\]\]$/)
```

This pattern only matched markers at the very END of the text. However, system messages created by commands in `input.js` have the format:
```
[SYSTEM] You go to sleep... [[00y00m00d07h52n00s]]. 
```

The period and space after `]]` prevented the regex from matching. When the context hook couldn't find the previous command's timestamp, it returned `lastTT = 0`, causing the second command to start from zero instead of accumulating time.

**Solution Implemented**:
Removed the `$` anchor from both regex patterns:
```javascript
// Before:
actionText.match(/\[\[(\d{2}y\d{2}m\d{2}d\d{2}h\d{2}n\d{2}s)\]\]$/)

// After:
actionText.match(/\[\[(\d{2}y\d{2}m\d{2}d\d{2}h\d{2}n\d{2}s)\]\]/)
```

This allows the regex to match timestamp markers anywhere in the text, not just at the end, ensuring proper time accumulation across multiple commands.

**Files Modified**:
- `library.js`: Fixed regex in `getLastTurnTimeAndChars()` function (line 530)
- `context.js`: Fixed regex in turntime detection (line 72)

**Impact**:
- Back-to-back commands now properly accumulate time
- `[sleep]` followed by `[advance]` correctly adds both time amounts
- Multiple commands in sequence maintain accurate time tracking
- Time state persists correctly between turns

**Example Before Fix**:
```
[settime 08/08/2037 6:00 AM] → 00h00m
[sleep] → 07h52m
[advance 2 hours] → 02h03m (WRONG - should be ~09h55m)
```

**Example After Fix**:
```
[settime 08/08/2037 6:00 AM] → 00h00m
[sleep] → 07h52m
[advance 2 hours] → 09h52m (CORRECT)
```

**Backup Created**: `Backup/autocards_wtg_2.0_1.0.6_back_to_back_command_fix_2025-10-29/`

---

### Version 1.0.5 (2025-10-28)
**Bug Fix: System Message Spacing and Output Duplication**

**Issues Fixed**:
1. **System Message Spacing**: After using commands like `[sleep]`, `[advance]`, `[settime]`, or `[reset]`, there was no space/newline between the system message and the following AI response, causing text to run together.

2. **Output.js Duplication**: The `output.js` file contained 7 duplicate copies of the same code (entire modifier function repeated), causing the file to be unnecessarily large and potentially introducing bugs.

3. **System Message Punctuation**: All system messages now end with a period after the timestamp marker for proper sentence structure.

**Root Cause**:
1. In `input.js` (line 164), system messages were joined with `messages.join('\n') + (modifiedText ? '\n' + modifiedText : '')`, which only added a newline if modifiedText existed. Since commands set modifiedText to empty string, no trailing newline was added after system messages.

2. The `output.js` file had been accidentally duplicated multiple times during previous edits, resulting in 7 copies of the same 245-line modifier function.

3. System messages lacked terminal periods, leaving sentences incomplete.

**Solution Implemented**:
1. **Fixed System Message Spacing**: Updated `input.js` to always add a newline after system messages:
   ```javascript
   // Before:
   modifiedText = messages.join('\n') + (modifiedText ? '\n' + modifiedText : '');
   
   // After:
   modifiedText = messages.join('\n') + '\n' + (modifiedText || '');
   ```
   This ensures proper spacing between system messages and the AI's response.

2. **Removed Duplicate Code**: Cleaned up `output.js` by removing 6 duplicate copies, keeping only the single correct version.

3. **Added Terminal Periods**: Updated all system messages to include a period after the `[[timestamp]]` marker:
   - `[SYSTEM] You go to sleep... [[${ttMarker}]]. `
   - `[SYSTEM] Advanced X unit... [[${ttMarker}]]. `
   - `[SYSTEM] Starting date and time set to... [[${ttMarker}]]. `
   - `[SYSTEM] Date and time reset to... [[${ttMarker}]]. `

**Files Modified**:
- `input.js`: Fixed system message spacing logic (line 165) and added periods to all system messages (lines 36, 46, 88, 116, 149)
- `output.js`: Removed duplicate code, reduced from 1717 lines to 245 lines

**Impact**:
- System messages now have proper spacing before AI responses
- System messages are now properly punctuated with terminal periods
- Commands like `[sleep]` and `[advance]` display cleanly with complete sentences
- File size reduced significantly (output.js now ~14KB instead of ~67KB)
- Improved code maintainability

**Example Before Fix**:
```
[SYSTEM] You go to sleep and wake up later that day on 08/08/2037 at 12:32 PM. [[00y00m00d06h32n00s]]You awaken feeling refreshed...
```

**Example After Fix**:
```
[SYSTEM] You go to sleep and wake up later that day on 08/08/2037 at 12:32 PM. [[00y00m00d06h32n00s]]. 

You awaken feeling refreshed...
```

**Backup Created**: `Backup/autocards_wtg_2.0_system_message_spacing_fix_2025-10-28/`

---

### Version 1.0.4 (2025-10-24)
**Bug Fix: Timestamp Assignment - Keyword Detection**

**Issue Fixed**:
After using the `[settime]` command or during normal gameplay, all character and location storycards were receiving "discovered/met on" timestamps, even if they were never mentioned in the adventure. This caused storycards to be marked as discovered prematurely, cluttering the game state with cards that hadn't actually been encountered yet.

**Root Cause**:
In `output.js` (lines 206-218), the system was adding timestamps to ALL storycards that didn't have them, without checking if the storycard's keywords were actually mentioned in the adventure text. This was overly aggressive and didn't respect the intent of discovery-based timestamps.

**Solution Implemented**:
1. **Added `isCardKeywordMentioned()` Function**: New helper function in `library.js` that checks if any of a storycard's keywords are mentioned in the given text
   - Uses case-insensitive matching
   - Checks for whole word matches to avoid partial matches
   - Splits keywords by comma and tests each one

2. **Updated Timestamp Logic**: Modified `output.js` to only add timestamps when:
   - The card doesn't already have a timestamp AND
   - The card's keywords are mentioned in the combined text (player action + AI output)

3. **Combined Text Analysis**: Now analyzes both the player's action and the AI's output together to ensure keywords are actually present before stamping cards

**Code Changes**:
- **library.js**: Added `isCardKeywordMentioned(card, text)` function (lines 638-665)
- **output.js**: Updated timestamp assignment logic to use keyword detection (lines 205-221)

**Files Modified**:
- `library.js`: Added keyword detection function
- `output.js`: Updated timestamp assignment logic with keyword check

**Impact**:
- Storycards now only get timestamps when they are actually mentioned in the adventure
- Prevents premature "discovery" of entities that haven't been encountered yet
- More accurate tracking of when characters/locations were first introduced
- Cleaner game state with only relevant cards marked as discovered

**Backup Created**: `Backup/autocards_wtg_2.0_timestamp_fix_2025-10-24/`

**Note**: This same bug was present in all wtg 2.0 variants and has been fixed across the board:
- `wtg_2.0/` (Backup: `wtg_2.0_timestamp_fix_2025-10-24/`)
- `wtg_2.0_lightweight/` (Backup: `wtg_2.0_lightweight_timestamp_fix_2025-10-24/`)
- `wtg_2.0_scenario/` (Backup: `wtg_2.0_scenario_timestamp_fix_2025-10-24/`)

---

### Version 1.0.3 (2025-10-14)
**Feature: Automatic Storycard [settime] Detection at Scenario Start**

**New Features**:
1. **Storycard [settime] Processing**: When a scenario first starts, the system now scans all storycards for `[settime]` commands. If found, the command is automatically processed to set the starting date and time, allowing the AI to immediately begin generating responses without showing the opening prompt.

2. **Command Removal**: After processing a `[settime]` command from a storycard, the command is automatically removed from the storycard entry to keep the story clean.

**How It Works**:
- At scenario start (action count ≤ 1), all storycards are scanned for `[settime date time]` commands
- Format: `[settime mm/dd/yyyy time]` (e.g., `[settime 08/15/2024 3:30 pm]`)
- Supports various date separators: `/`, `-`, `.`
- Supports both 2-digit and 4-digit years
- Time formats: `3:30 pm`, `3 pm`, `15:30`, etc.
- Once found and processed, the command is removed from the storycard
- The opening prompt is skipped, and the AI generates the first response immediately

**Use Case**:
This feature is perfect for scenarios where you want to pre-configure the starting time without requiring players to manually enter a `[settime]` command. Simply add `[settime 01/15/2025 8:00 am]` to any storycard entry in your scenario, and players can start playing immediately.

**Example**:
Create a storycard with entry:
```
[settime 12/25/2024 6:00 am]
It's Christmas morning in Victorian London...
```

When the scenario starts, the time is automatically set to December 25, 2024 at 6:00 AM, and the AI begins the story without showing the setup prompt.

**Files Modified**:
- `output.js`: Added storycard scanning and [settime] processing logic at scenario start

**Backup Created**: `Backup/wtg_autocards_storycard_settime_detection_2025-10-14/`

---

### Version 1.0.2 (2025-10-08)
**Bug Fix: Storycard Update and System Message Format (Final Solution)**

**Issues Fixed**:
1. **Storycard Not Updating**: User commands ([sleep], [advance], [settime], [reset]) would update `state.currentDate` and `state.currentTime`, but the "Current Date and Time" storycard wouldn't update because changes made in the input hook don't persist to storycards reliably.

2. **Bracketed Messages Ignored by AI**: System messages like `[Advanced 2 hours. New date/time: 08/08/2037 8:01 AM.]` were being ignored by the AI because they looked like user commands in brackets.

3. **Sleep Command Time Initialization**: When using `[sleep]` with Unknown time, the command wasn't properly initializing `startingTime`.

**Solution Implemented**:
Inject the turn time marker `[[00y00m00d06h01n00s]]` directly into system messages, reusing the existing timestamp detection mechanism:

1. **Input Hook**: Adds `[[turntime]]` marker to system messages (e.g., `[SYSTEM] You go to sleep... [[00y00m01d00h00n00s]]`)
2. **Context Hook**: Detects `[[turntime]]` in the last action and uses it directly without adding character-based time
3. **Changed Format**: System messages now use `[SYSTEM]` prefix instead of wrapping entire message in brackets
4. **Fixed [sleep]**: Properly initializes `startingTime` to "8:00 AM" when transitioning from Unknown

**Files Modified**:
- `input.js`: Added `[[turntime]]` markers to all command system messages, updated message format to `[SYSTEM]`
- `context.js`: Added check to use `[[turntime]]` from last action directly when present
- `library.js`: Removed unused pending change functions
- `output.js`: Removed unnecessary pending change check

**Backup Created**: `Backup/wtg_autocards_storycard_update_fix_2025-10-08/`

### Version 1.0.1 (2025-10-08)
**Bug Fix: [sleep] Command Time Initialization**

**Issue**: When using the `[sleep]` command with an Unknown time, the command would set `state.currentTime` to "8:00 AM" but not update `state.startingTime`. This caused subsequent time calculations to fail because `computeCurrent()` would still use `startingTime='Unknown'` and return Unknown time.

**Fix**: Modified the `[sleep]` command to properly initialize time when transitioning from Unknown:
- Reset `state.turnTime` to zero before adding the sleep duration
- Set `state.startingTime` to "8:00 AM" when time is Unknown
- Allow `computeCurrent()` to calculate the correct time based on the new starting time
- This ensures future `[advance]` commands work correctly after using `[sleep]`

**Files Modified**:
- `input.js` (lines 36-45): Updated [sleep] command to initialize startingTime

**Backup Created**: `Backup/wtg_autocards_sleep_advance_fix_2025-10-08/`

### Version 1.0.0 (2025-10-03)
Combined System - Initial release

## Overview

This is a combined system that merges **WTG 2.0 Lightweight** (World Time Generator) with **AutoCards** automatic storycard generation. The system ensures WTG runs first to maintain time consistency before AutoCards processes content.

## Core Components

### WTG 2.0 Lightweight
- **Time tracking**: Tracks elapsed time in years, months, days, hours, minutes, and seconds
- **Command processing**: Handles time-related commands ([settime], [advance], [reset], [sleep])
- **Timestamp injection**: Automatically adds timestamps to storycards
- **Adventure erasing detection**: Handles time jumps when navigating adventure history

### AutoCards
- **Automatic storycard generation**: Creates and updates plot-relevant story cards
- **Entity detection**: Identifies characters, locations, and other entities from story content
- **Memory management**: Maintains and compresses storycard memories
- **Configuration system**: Extensive customization options for card generation

## Execution Order

The combined system executes in this order to ensure compatibility:

1. **Input Hook**: WTG command processing → AutoCards title detection
2. **Context Hook**: WTG time injection → AutoCards context modifications
3. **Output Hook**: WTG timestamps → AutoCards card generation

## WTG Features

### Time Tracking
- **Turn Time**: Tracks elapsed time in `00y00m00d00h00n00s` format
- **Current Date/Time**: Maintains current in-story date and time
- **Character-based advancement**: 1 minute per 700 characters (fixed rate)
- **Automatic timestamp injection**: All storycards get discovery timestamps

### Commands (all enclosed in brackets `[command]`)

#### [settime mm/dd/yyyy time]
Set the starting date and time for your adventure.
- **Format**: `[settime 06/15/2023 3:30 PM]`
- **Date**: mm/dd/yyyy or dd/mm/yyyy (auto-detected)
- **Time**: 12-hour format (3:30 PM) or 24-hour format (15:30)
- **Effect**: Resets turn time to zero, updates all existing timestamps

#### [advance N unit]
Manually advance time by a specified amount.
- **Format**: `[advance 5 hours]`, `[advance 2 days]`, `[advance 3 months]`
- **Units**: hours, days, months, years
- **Effect**: Advances time immediately

#### [reset]
Reset date and time to the most recent mention in story history.
- **Format**: `[reset]`
- **Effect**: Scans history for date/time mentions and resets to most recent

#### [sleep]
Natural language command to sleep to the next morning.
- **Format**: Include "[sleep]" in your action
- **Effect**: Sleep 6-9 hours with random minutes, wake up at 8:00 AM if next day

### System Storycards
- **Current Date and Time**: Displays current date/time and turn time
- **WTG Data**: Stores turn data for adventure erasing detection (internal use only)

## AutoCards Features

### Automatic Storycard Generation
- **Entity Detection**: Automatically identifies and creates cards for characters, locations, etc.
- **Title Detection**: Scans story content for potential card titles
- **Memory Management**: Maintains compressed memories of card information
- **Cooldown System**: Prevents excessive card generation

### Configuration Options
AutoCards includes extensive configuration options via the "Configure Auto-Cards" storycard:
- **Generation Settings**: Card creation cooldown, entry limits, memory compression
- **Detection Settings**: Title detection from inputs, banned titles, look-back distance
- **Display Settings**: Bulleted list mode, debug data visibility
- **Advanced Settings**: Memory limits, compression ratios, interface options

### Manual Controls
- **API Functions**: Emergency halt, postpone events, toggle on/off
- **Card Management**: Regenerate, delete, or modify individual cards
- **Memory Updates**: Manually add or compress card memories

## Combined System Benefits

### Synergistic Features
1. **Time-Aware Card Generation**: AutoCards creates cards with accurate timestamps from WTG
2. **Context Integration**: WTG injects current date/time into context for AutoCards
3. **Consistent Timing**: WTG's time state is set before AutoCards processes content
4. **Enhanced Storycards**: Cards include both content and temporal information

### Compatibility
- **No Conflicts**: Both systems use separate state variables and storycard APIs
- **Preserved Functionality**: All features from both systems remain intact
- **Performance Optimized**: WTG Lightweight provides efficient time tracking

## Usage Instructions

### Initial Setup
1. Copy all 4 files into your AI Dungeon shared library:
   - `context.js`
   - `input.js`
   - `library.js`
   - `output.js`

2. Start a new adventure or continue an existing one
3. Use `[settime mm/dd/yyyy time]` to set your starting date and time
4. Configure AutoCards via the "Configure Auto-Cards" storycard (appears automatically)

### During Adventure
- **Time Management**: Time advances automatically based on story length
- **Command Usage**: Use WTG commands as needed to adjust time
- **Card Generation**: AutoCards automatically creates relevant storycards
- **Configuration**: Access AutoCards settings through the configuration card

### Best Practices
- Set a starting time at the beginning of your adventure
- Use [advance] for intentional time jumps (travel, waiting)
- Use "[sleep]" when your character sleeps
- Use [reset] if time gets out of sync with story
- Configure AutoCards settings to match your playstyle
- Review generated cards and edit them as needed

## Technical Details

### File Structure
- **library.js** (~6,700 lines): WTG functions + AutoCards function
- **input.js** (~160 lines): WTG commands → AutoCards input processing
- **context.js** (~70 lines): WTG time injection → AutoCards context processing
- **output.js** (~100 lines): WTG timestamps → AutoCards card generation

### Integration Points
- **State Management**: WTG uses `state.turnTime`, AutoCards uses separate state
- **Storycard API**: Both systems use compatible storycard creation methods
- **Return Values**: Properly chained between WTG and AutoCards processing
- **System Cards**: WTG's cards don't interfere with AutoCards functionality

### Performance Considerations
- WTG Lightweight: Minimal overhead, efficient time calculations
- AutoCards: Optimized with cooldowns and memory compression
- Combined System: Maintains performance while adding both feature sets

## Comparison with Individual Systems

| Feature | WTG Only | AutoCards Only | Combined |
|---------|----------|----------------|----------|
| Time Tracking | ✅ Full | ❌ None | ✅ Full |
| Timestamp Injection | ✅ Yes | ❌ None | ✅ Yes |
| Card Generation | ❌ None | ✅ Full | ✅ Full |
| Commands | ✅ Time | ❌ None | ✅ Time |
| Configuration | ❌ Minimal | ✅ Extensive | ✅ Extensive |
| Performance | ✅ Excellent | ✅ Good | ✅ Good |
| Setup Complexity | ✅ Simple | ✅ Moderate | ✅ Moderate |

## Troubleshooting

### Common Issues

**Time not advancing**: Ensure you've set a starting time with `[settime]`

**Cards not generating**: Check AutoCards cooldown settings in configuration card

**Timestamp conflicts**: WTG timestamps and AutoCards shouldn't conflict, but check configuration

**Performance issues**: Adjust AutoCards settings (increase cooldowns, reduce memory limits)

### Debug Information
- Check "Current Date and Time" storycard for WTG status
- Check "Configure Auto-Cards" storycard for AutoCards settings
- Enable AutoCards debug mode to see detailed generation logs

## Support

For questions or issues:
- WTG issues: Refer to original WTG documentation
- AutoCards issues: Check AutoCards configuration and settings
- Combined system: Test individual components separately to isolate issues

## Future Enhancements

The combined system maintains the lightweight philosophy:
- WTG time rate customization (optional single setting)
- AutoCards configuration presets
- Enhanced integration between time and card generation
- Additional timestamp formatting options

---

**Combined System Total**: ~6,930 lines (WTG ~670 + AutoCards ~6,000 + Integration ~260)
**Performance**: Excellent (WTG Lightweight) + Good (AutoCards) = Good combined
**Compatibility**: Full backward compatibility with both individual systems
