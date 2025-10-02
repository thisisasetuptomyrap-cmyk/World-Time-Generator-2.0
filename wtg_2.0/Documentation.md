# WTG 2.0 Documentation

## Version: 2.1.20 (Enhanced AI Instructions)
Date: 2025-10-02

## Overview
Enhanced the AI instruction format to ensure consistent parentheses formatting for characters and locations. Replaced SCRATCHPAD tags with more prominent bracketed format, added concrete examples, and strengthened language to make rules explicit and imperative.

## Changes Made

### 1. Replaced SCRATCHPAD Format with Bracketed Headers
- **Old**: `<SCRATCHPAD>` tags with passive language
- **New**: `[IMPORTANT FORMATTING RULES - ALWAYS FOLLOW]` with imperative language
- **Reason**: Bracketed format is more attention-grabbing for AI models

### 2. Enhanced Instruction Clarity
- **Specificity**: Changed "Format new character entities" to "When introducing or mentioning ANY character (person, creature, NPC)"
- **Examples**: Added concrete examples like "(Marcus)", "(The Innkeeper)", "((The Golden Tavern))"
- **Context**: Embedded examples in natural sentence context
- **Timing**: Specified "on first mention" to clarify when to apply

### 3. Strengthened Emphasis
- **Keywords**: Used all-caps for "REQUIRED", "MUST", "ALWAYS FOLLOW"
- **Imperative**: "You MUST use this formatting every time"
- **Importance**: "it is critical for the game system to function"
- **Explanation**: Clarified that parentheses are invisible to user

### 4. New Instruction Format
```
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

[END FORMATTING RULES]
```

## Files Modified
- `wtg_2.0/context copy.js`: Replaced SCRATCHPAD instructions with enhanced bracketed format (lines 176-193)

## Testing Recommendations
1. **Consistency**: Generate 10+ characters in one scenario and verify ALL get formatted
2. **Both Modes**: Test with Debug Mode true AND false
3. **Edge Cases**: Role-based characters "(The Guard)", compound names "((Silver Moon Castle))"
4. **From Start**: Verify formatting is consistent from turn 1 onwards

## Previous Version: 2.1.19 (AutoCards Cleanup & Settings Reorganization)
Date: 2025-10-01

## Overview
Performed comprehensive cleanup of unused AutoCards functionality and reorganized settings for consistency. This cleanup removes ~700 lines of unused code and simplifies the codebase while maintaining all current WTG functionality.

## Changes Made

### 1. Removed AutoCards Functionality
- **What Was Removed**: AutoCards was a legacy automatic storycard generation system that's no longer being used
- **Implementation**: Current WTG uses parentheses-based entity detection instead
- **Code Removed**: ~700 lines including entire AutoCards state management, cooldown system, and API
- **Files Modified**: 
  - `context copy.js`: Removed AutoCards prompt injection logic
  - `output copy.js`: Removed AutoCards entry processing logic
  - `input copy.js`: Removed AutoCards state initialization and turn tracking
  - `library copy.js`: Removed entire AutoCards implementation
- **Impact**: No functionality loss, cleaner codebase, reduced complexity

### 2. Reorganized Settings for Consistency
- **Old Settings**: "Disable Generated Character Cards: false" and "Enable Generated Location Cards: true"
- **New Settings**: "Enable Generated Character Cards: true" and "Enable Generated Location Cards: true"
- **Reason**: Eliminated confusing double negatives and inconsistent naming
- **Logic Updated**: Changed from `if (!disableCharacterCards)` to `if (enableCharacterCards)` for clearer code
- **Files Modified**: library copy.js, input copy.js, output copy.js

### 3. Current Settings Format
```
Time Duration Multiplier: 1.0
Enable Generated Character Cards: true
Enable Generated Location Cards: true
Disable Generated Card Deletion: true
Debug Mode: false
Enable Dynamic Time: true
Disable WTG Entirely: false
```

## Files Modified
- `wtg_2.0/context copy.js`: Removed AutoCards prompt injection (19 lines)
- `wtg_2.0/output copy.js`: Removed AutoCards processing, updated setting references (30 lines)
- `wtg_2.0/input copy.js`: Removed AutoCards state management, updated setting references (25 lines)
- `wtg_2.0/library copy.js`: Removed entire AutoCards implementation (~700 lines)

## Testing Recommendations
1. **Character Cards**: Verify (CharacterName) generates cards when "Enable Generated Character Cards" is true
2. **Location Cards**: Verify ((LocationName)) generates cards when "Enable Generated Location Cards" is true
3. **Settings Toggle**: Test both true/false states for each setting
4. **No Errors**: Check console for any AutoCards-related errors
5. **Same Functionality**: All existing WTG features should work identically to before

## Previous Version: 2.1.18 (Scratchpad Tag Fix)
Date: 2025-10-01

## Overview
Fixed critical bug where AI was not consistently receiving instructions to format character and location names with parentheses due to malformed scratchpad closing tags in the context script.

## Changes Made

### 1. Fixed Malformed Scratchpad Closing Tags
- **Issue Fixed**: AI was not consistently formatting character/location names with parentheses
- **Symptom**: Some entities were being generated without proper parentheses formatting
- **Root Cause**: Both opening and closing scratchpad tags used `<SCRATCHPAD>` instead of proper `</SCRATCHPAD>` closing tags
- **Impact**: Malformed XML/HTML tags caused AI to ignore or misinterpret critical formatting instructions
- **Fix**: Corrected closing tags from `<SCRATCHPAD>` to `</SCRATCHPAD>` in both scratchpad sections

### 2. Affected Instructions
- **Entity Formatting Instructions (Lines 195-200)**: Tell AI to format character names with single parentheses (Character) and location names with double parentheses ((Location))
- **Dynamic Time Instructions (Lines 207-209)**: Tell AI to use (sleep X units) and (advance X units) commands for time progression

### 3. Code Changes
- **File Modified**: `context copy.js`
- **Line 200**: Changed `<SCRATCHPAD>` to `</SCRATCHPAD>`
- **Line 209**: Changed `<scratchpad>` to `</scratchpad>`

## Files Modified
- `wtg_2.0/context copy.js`: Fixed scratchpad closing tags

## Testing Recommendations
1. **Consistent Formatting**: Verify AI now consistently formats character names with (Character) and locations with ((Location))
2. **Storycard Creation**: Verify entity storycards are created properly when entities are mentioned
3. **Debug Mode false**: Verify parentheses are stripped from display
4. **Debug Mode true**: Verify parentheses remain visible for verification

## Previous Version: 2.1.17 (Entity Detection Execution Order Fix)
Date: 2025-10-01

## Overview
Fixed critical bug where entity detection failed to create storycards when Debug Mode was false, even though the AI was correctly formatting entities in parentheses. The issue was caused by entity detection executing too late in the processing flow, after other text manipulations had occurred that could interfere with regex matching.

## Changes Made

### 1. Repositioned Entity Detection to Execute Early
- **Issue Fixed**: When Debug Mode is false, storycards were not being generated for characters/locations that the AI correctly formatted in parentheses
- **Symptom**: AI properly capitalized entity names (e.g., "John's Livingroom"), indicating parentheses usage, but no storycards were created. Output correctly showed entities without parentheses in non-debug mode, but storycard generation silently failed.
- **Root Cause**: Entity detection code executed after multiple text processing steps, allowing other operations to potentially interfere with regex matching state
- **Fix**: Moved entire entity detection and storycard creation block from lines 331-744 to lines 109-374, ensuring it processes pristine AI output before ANY text manipulation
- **Code Changes**:
  - Moved entity detection block to execute immediately after lastAction determination
  - Added clear section markers for Entity Detection (lines 109-374)
  - Removed duplicate entity detection code from old location
  - Fixed brace nesting for turn data and timestamp detection blocks

### 2. Benefits of New Execution Order
- Entity detection now runs on completely pristine AI output
- No risk of regex state pollution from earlier processing
- Clear separation: detect entities first, format display second
- Consistent behavior regardless of debug mode setting
- More maintainable code with explicit execution order

### 3. Updated Code Flow
```
1. Initialize variables (lines 3-107)
2. → DETECT ENTITIES AND CREATE STORYCARDS (lines 109-374) [MOVED HERE]
3. Process time commands (lines 376-479)
4. Strip parentheses for display based on debug mode (lines 491-502)
5. Update time and trigger tracking (lines 504-595)
6. Process deprecation and turn data (lines 598-753)
7. Return modified text (line 772)
```

## Files Modified
- `wtg_2.0/output copy.js`: Moved entity detection block to early execution position

## Testing Recommendations
1. **Debug Mode = false**: AI outputs "(John) at ((Castle))" → Should show "John at Castle" AND create storycards
2. **Debug Mode = true**: AI outputs "(John) at ((Castle))" → Should show "(John) at ((Castle))" AND create storycards
3. **Triple Parentheses**: Test description injection with "(((John) tall warrior)))"
4. **Multiple Entities**: Test discovery card creation with multiple entities in one turn

## Previous Version: 2.1.15 (Generated Card Deletion Fix)
Date: 2025-10-01

## Overview
Fixed critical bug where generated character and location cards were being deprecated even when the "Disable Generated Card Deletion" setting was enabled. Also updated default settings for production release and improved initial prompt with example and bug reporting contact.

## Changes Made

### 1. Fixed Depreciation Logic to Respect Deletion Setting
- **Issue Fixed**: Depreciation logic in context.js ran every turn without checking the deletion setting
- **Root Cause**: The depreciation block executed unconditionally, ignoring user's preference to preserve cards
- **Fix**: Wrapped depreciation logic with setting check - only runs when setting is false (depreciation enabled)
- **Behavior**:
  - Setting FALSE (default): Cards depreciate when entities no longer detected (depreciation enabled)
  - Setting TRUE: Cards never depreciate, even if entities disappear (depreciation disabled)
- **Code Changes**:
  - Added `const disableCardDeletion = getWTGBooleanSetting("Disable Generated Card Deletion")` check
  - Wrapped entire depreciation block (lines 151-182) with `if (!disableCardDeletion)` in context copy.js
  - Now respects user preference for both characters and locations

### 2. Renamed Setting for Broader Scope
- **Change**: "Disable Generated Character Card Deletion" → "Disable Generated Card Deletion"
- **Reason**: Original name was too narrow, only mentioning characters when it affects locations too
- **Impact**: Setting now clearly indicates it applies to all generated entities (characters AND locations)
- **Code Changes**:
  - Updated default settings in library copy.js line 506
  - Updated setting reference in output copy.js line 569

### 3. Changed Default Debug Mode to False
- **Change**: Debug Mode default changed from `true` to `false`
- **Reason**: Production release should not show debug output by default
- **Impact**: Commands and debug info now hidden from players unless explicitly enabled
- **Code Changes**:
  - Updated default setting in library copy.js line 507

### 4. Updated Initial Prompt
- **Changes**:
  - Removed brackets from message (now natural text, not system message)
  - Added example command: `(eg: [settime 01/01/1900 12:00 am])`
  - Added bug reporting contact: "To report bugs, message me on discord: thedenial. (it has a period at the end of it)"
- **Applied To**: Both regular wtg_2.0 and wtg_2.0_lightweight versions
- **Code Changes**:
  - Updated output copy.js line 15 (regular version)
  - Updated output copy.js line 10 (lightweight version)

### 5. Enhanced Command Removal During Cooldowns
- **Issue Fixed**: AI model could output (sleep) or (advance) commands during active cooldowns
- **Root Cause**: Commands were only removed when Debug Mode was false, allowing them to appear during cooldowns
- **Fix**: Commands are now ALWAYS removed from output during active cooldowns, even in Debug Mode
- **Implementation**:
  - Leading commands: Removed immediately if cooldown is active (lines 195-206 in output copy.js)
  - Final sanitation: Removes ALL sleep/advance commands if any cooldown is active (lines 211-217)
  - Debug mode logic: Moved up to preserve command parentheses during cooldowns when debug enabled
  - Selective stripping: Only strips non-command parentheses in normal mode
- **Code Changes**:
  - Modified command removal logic in output copy.js to check cooldown status
  - Added `shouldRemoveAllCommands` check that includes cooldown status
  - Moved debug mode logic after command removal to preserve commands during cooldowns
  - Updated regex to selectively strip parentheses while preserving commands

### 6. Strengthened Cooldown Guidance to Prevent Command Generation
- **Issue Fixed**: AI model tended to repeat (sleep) or (advance) commands after using them
- **Root Cause**: Weak cooldown guidance ("Don't sleep") was easily ignored by AI
- **Fix**: Changed to explicit CRITICAL warnings that commands will be rejected
- **New Guidance**:
  - Sleep cooldown: "CRITICAL: DO NOT use (sleep) commands - sleep is on cooldown and will be rejected."
  - Advance cooldown: "CRITICAL: DO NOT use (advance) commands - advance is on cooldown and will be rejected."
- **Code Changes**:
  - Strengthened cooldown instructions in context copy.js lines 214-218

### 6. Updated Location Card Setting Name
- **Change**: Corrected "Disable Generated Location Cards" to "Enable Generated Location Cards"
- **Reason**: Maintains consistency with the enable/disable pattern across settings
- **Code Changes**:
  - Updated in library copy.js line 505

## Files Modified
- `wtg_2.0/library copy.js`: Updated setting names and defaults
- `wtg_2.0/context copy.js`: Added deletion setting check to depreciation logic
- `wtg_2.0/output copy.js`: Updated initial prompt and setting reference
- `wtg_2.0_lightweight/output copy.js`: Updated initial prompt
- `wtg_2.0/Documentation.md`: Added version 2.1.15 details

## Testing Notes
User will test on AI Dungeon website since functionality only works there:
- Test with "Disable Generated Card Deletion" FALSE: Erase back to beginning, verify cards depreciate when entities disappear
- Test with "Disable Generated Card Deletion" TRUE: Erase back to beginning, verify cards remain even when entities disappear
- Test for both characters (single parentheses) and locations (double parentheses)
- Verify Debug Mode false hides commands by default
- Verify initial prompt shows correctly with example and contact info

## Previous Version: 2.1.14 (Cooldown Command Rejection)
Date: 2025-10-01

## Overview
Fixed critical issue where AI could initiate (sleep) or (advance) commands during active cooldowns, causing duplicate time jumps and cooldown overwrites. Commands are now rejected before processing when cooldowns are active.

## Changes Made

### 1. Added Cooldown Validation Before Command Processing
- **Issue Fixed**: AI commands were processed even during active cooldowns
- **Implementation**: Added `shouldProcessCommand` check after command detection in output.js
- **Behavior**:
  - Sleep commands rejected during active sleep cooldown (8 hours)
  - Advance commands rejected during active advance cooldown (5 minutes)
  - Time jumps only applied when no cooldown is active
  - Commands still removed from output regardless of processing status

### 2. Preserved Command Removal Logic
- **Consistency**: Commands removed from output in both valid and rejected scenarios
- **Debug Mode**: Commands visible when Debug Mode is true, hidden when false
- **Implementation**: Command removal happens after cooldown check, independent of processing

## Files Modified
- `wtg_2.0/output copy.js`: Added shouldProcessCommand cooldown validation
- `wtg_2.0/Documentation.md`: Added version 2.1.14 details

## Testing Notes
- Test sleep command during sleep cooldown - should be rejected, no time jump
- Test advance command during advance cooldown - should be rejected, no time jump
- Test Debug Mode true - commands visible but not processed during cooldown
- Test Debug Mode false - commands removed and not processed during cooldown
- Test commands after cooldown expires - should process normally

## Previous Version: 2.1.13 (Advance Command Cooldown Parity)
Date: 2025-10-01

## Overview (2.1.13)
Implemented cooldown parity for advance commands and added reset functionality for cooldowns. AI advance commands now have proper cooldown periods regardless of Dynamic Time setting, and user commands like [settime] and [reset] clear existing cooldowns.

## Changes Made (2.1.13)

### 1. Added Cooldown Helper Functions
- **New Feature**: Centralized cooldown management functions for consistent behavior
- **Functions Added**:
  - `setSleepCooldown(duration)` - Sets sleep cooldown period
  - `setAdvanceCooldown(duration)` - Sets advance cooldown period
  - `clearCommandCooldowns(source)` - Clears all active cooldowns
  - `updateCooldownCard()` - Updates WTG Cooldowns storycard display
- **Code Changes**:
  - Added helper functions to `library copy.js`

### 2. Updated User Command Cooldown Handling
- **New Feature**: User-issued [sleep] and [advance] commands now trigger cooldowns
- **Behavior**:
  - [sleep] command sets 8-hour cooldown
  - [advance] command sets 5-minute cooldown
  - [settime] and [reset] commands clear all cooldowns
- **Code Changes**:
  - Modified `input copy.js` to call helper functions after user commands

### 3. Refactored AI Command Cooldown Logic
- **Improvement**: Replaced inline cooldown logic with helper function calls
- **Code Changes**:
  - Updated `output copy.js` to use `setSleepCooldown()` and `setAdvanceCooldown()`

### 4. Enhanced Cooldown Guidance
- **New Feature**: Cooldown instructions now appear regardless of Dynamic Time setting
- **Behavior**: AI receives "Don't sleep" or "Don't advance" instructions whenever cooldowns are active
- **Code Changes**:
  - Modified `context copy.js` to check cooldowns independently of Dynamic Time setting

## Files Modified
- `wtg_2.0/library copy.js`: Added cooldown helper functions
- `wtg_2.0/input copy.js`: Added cooldown calls for user commands
- `wtg_2.0/output copy.js`: Refactored AI command cooldown logic
- `wtg_2.0/context copy.js`: Enhanced cooldown guidance display
- `wtg_2.0/Documentation.md`: Added version 2.1.13 details

## Testing Notes
- Test user [sleep] command: Should set 8-hour cooldown preventing AI sleep commands
- Test user [advance] command: Should set 5-minute cooldown preventing AI advance commands
- Test [settime] command: Should clear all existing cooldowns
- Test [reset] command: Should clear all existing cooldowns
- Test AI commands: Should work regardless of Dynamic Time setting enabled/disabled
- Verify WTG Cooldowns storycard shows correct availability timestamps

## Version: 2.1.10 (Enable Location Cards Initialization Fix)
Date: 2025-10-01

## Overview
Fixed temporal dead zone error in input modifier where enableLocationCards was accessed before initialization, preventing scenario startup.

## Changes Made

### 1. Fixed Variable Declaration Order
- **Issue**: const enableLocationCards was declared after its first use in if statement, causing ReferenceError: Cannot access 'enableLocationCards' before initialization
- **Fix**: Moved declaration to before the if block
- **Code Changes**:
  - Moved const enableLocationCards = getWTGBooleanSetting("Enable Generated Location Cards"); from line 203 to after line 176 in input copy.js

## Files Modified
- `wtg_2.0/input copy.js`: Moved enableLocationCards declaration

## Testing Notes
- Start a new scenario in AI Dungeon to verify no initialization error occurs
- Verify location card generation works when enabled

## Version: 2.1.8 (Time Duration Multiplier Safety Fix)
Date: 2025-10-01

## Overview
This version adds safety clamping to Time Duration Multiplier to prevent negative values causing backwards time progression. Multiplier is now clamped to >=0, ensuring time always advances forward or stays the same.

## Changes Made

### 1. Clamped Time Duration Multiplier to Prevent Backwards Time
- **Fix**: If multiplier <0 (user error), time could subtract, causing backwards progression
- **Implementation**: In parsing, use Math.max(0, parseFloat(value) || 1.0) in both output and context modifiers
- **Behavior**: Multiplier <1 slows time (no backwards); negative clamped to 0 (no time passage)
- **Code Changes**:
  - Updated multiplier parsing in `output copy.js` (line ~236)
  - Updated multiplier parsing in `context copy.js` (line ~116)

### 2. Updated Documentation
- Added notes on multiplier behavior and safety clamp
- Updated testing notes for time progression

## Files Modified
- `wtg_2.0/output copy.js`: Clamped multiplier parsing
- `wtg_2.0/context copy.js`: Clamped multiplier parsing
- `wtg_2.0/Documentation.md`: Added version 2.1.8 details

## Testing Notes
- Set multiplier to -1: Time should not go backwards (clamped to 0, no passage)
- Set multiplier to 0.5: Time advances slower but forward
- Verify in both output and context hooks
- Default 1.0: Normal progression

## Previous Versions

## Overview
This version improves AI command handling for (sleep) and (advance) commands with cooldowns, dynamic prompting, turn data storage, and better debug mode behavior.

## Changes Made

### 1. Added AI Command Field to Turn Data
- **New Feature**: Turn data now stores AI-generated commands for tracking and analysis
- **Implementation**: Added `aiCommand` field to turn data structure in WTG Data storycard
- **Code Changes**:
  - Modified `addTurnData()` function in `library copy.js` to accept and store AI command
  - Updated `getTurnData()` to parse and return AI command field
  - Updated all turn data cleanup functions to handle the new field

### 2. Implemented Dynamic Prompting with Cooldowns
- **New Feature**: AI prompting for sleep/advance commands now adapts based on cooldown state
- **Behavior**:
  - After sleep command: Instructions change to "Don't sleep" for 8 hours
  - After advance command: Instructions change to "Don't advance" for 5 minutes
  - Cooldowns prevent command repetition at inconvenient times
- **Code Changes**:
  - Added cooldown checking functions `isSleepCooldownActive()` and `isAdvanceCooldownActive()` in `library copy.js`
  - Modified context injection in `context copy.js` to use dynamic instructions based on cooldown state

### 3. Added Timestamp Injection in Current Date and Time Storycard
- **New Feature**: Storycard displays wake-up and advance timestamps
- **Display**:
  - After sleep: Shows "Woke up on: [date] [time]"
  - After advance: Shows "Advanced until: [date] [time]"
  - Timestamps are overwritten when new commands are issued
- **Code Changes**:
  - Modified `updateDateTimeCard()` in `library copy.js` to inject timestamps based on cooldown state

### 4. Implemented Cooldown Logic
- **New Feature**: Automatic cooldown periods after AI commands
- **Details**:
  - Sleep cooldown: 8 hours from wake-up time
  - Advance cooldown: 5 minutes from command execution
  - Cooldowns tracked using turn time format for persistence
- **Code Changes**:
  - Added state variables for cooldown tracking in `input copy.js`
  - Modified command detection in `output copy.js` to set cooldown timestamps

### 5. Fixed Debug Mode Logic
- **Issue**: Commands were shown when debug false, hidden when debug true
- **Fix**: Commands are now hidden from output when debug mode is false (corrected logic)
- **Code Changes**:
  - Changed condition in `output copy.js` from `getWTGBooleanSetting("Debug Mode")` to `!getWTGBooleanSetting("Debug Mode")`

### 6. Fixed Null Error in Cooldown Functions
- **Issue**: compareTurnTime error when parseTurnTime returns null for invalid timestamps or state.turnTime is null
- **Fix**: Added null checks for both parsed timestamps and state.turnTime in isSleepCooldownActive and isAdvanceCooldownActive functions; added early guard in compareTurnTime to return 0 for null inputs; initialized state.turnTime in all hooks; unified Turn Data regex across all functions; added null-skip in cleanup functions for invalid timestamps
- **Code Changes**:
  - Added `if (!state.turnTime) return false;` checks and `if (!availableTT) return false;` in `library copy.js`
  - Added early return guard in `compareTurnTime()` for null inputs
  - Initialized `state.turnTime` at the top of `input copy.js`, `context copy.js`, `output copy.js`
  - Unified Turn Data regex and field order across `getTurnData`, `addTurnData`, `cleanupWTGDataCard`, `cleanupWTGDataCardByTimestamp`
  - Added null-skip in cleanup functions when `parseTurnTime` fails

### 7. Cooldown Storycard and Enhanced Command Removal
- **New Feature**: WTG Cooldowns storycard tracks when sleep and advance commands become available again
- **Implementation**: Card has no keys (not included in context), shows human-readable timestamps for command availability and initiation tracking
- **Enhanced Removal**: Global sanitation removes all (sleep …) and (advance …) commands from output when Debug Mode is false
- **Context Conditioning**: Usage instructions are conditionally included/excluded based on cooldown state
- **Fallback Time Adjustment**: When commands are removed from output, time adjustments are applied via cooldown card tracking with buffer periods
- **Benefits**: Prevents command spam, provides visual cooldown feedback, ensures clean output and reliable time progression
- **Code Changes**:
  - Added `getCooldownCard()` helper in `library copy.js`
  - Updated cooldown logic to use `sleepAvailableAtTT` and `advanceAvailableAtTT` fields
  - Added global command removal pass in `output copy.js`
  - Modified context instructions in `context copy.js` to respect cooldowns
  - Added `checkAndApplyPendingCommands()` function for fallback time adjustment when commands are sanitized from output

### 6. Updated Turn Data Recording
- **Enhancement**: AI commands are now recorded in turn data for each turn
- **Code Changes**:
  - Modified `output copy.js` to pass detected AI command to `addTurnData()`
  - Added `state.aiCommandThisTurn` to store command for the current turn

### 1. Fixed Depreciation Logic (Previous)
- **Issue**: Generated storycards weren't being depreciated when entities were no longer detected in the current story
- **Root Cause**: Depreciation logic was checking against WTG Data presence instead of current story detection, and was only running conditionally
- **Fix**: Moved depreciation logic to context hook to run on every turn, checking if generated entities are currently mentioned in text/history
- **Code Changes**:
  - Removed depreciation logic from `output copy.js`
  - Added new depreciation logic in `context copy.js` that scans current text and recent history for entity mentions
  - Deprecates cards with type "deprecated", clears keys, removes timestamps when entities are no longer detected

### 2. Removed Redundant Deleted Characters Card
- **Issue**: "Deleted Characters" storycard was created as redundant backup for depreciation
- **Root Cause**: Legacy code from when depreciation was more aggressive
- **Fix**: Removed all creation and usage of "Deleted Characters" card
- **Code Changes**:
  - Removed `getDeletedCharactersCard()` and `deleteDeletedCharactersCardIfEmpty()` functions from `library copy.js`
  - Removed "Deleted Characters" from system card skips in multiple files
  - Removed deletion logic from `cleanupStoryCardsByTimestamp()` in `library copy.js`

### 3. Previous Fixes (2.1.3)
- **Issue**: Input modifier threw "isTriggerMentioned is not defined" error
- **Root Cause**: Calls to undefined functions `isTriggerMentioned` and `trackTriggerMention` in trigger detection code
- **Fix**: Removed redundant trigger tracking calls that were causing errors, as the functionality is already handled by `state.currentTurnTriggers`
- **Code Changes**:
  - Removed `if (!isTriggerMentioned(card.title, trigger)) { trackTriggerMention(...) }` calls from `input copy.js`

### 2. Fixed Continue Action Recognition
- **Issue**: Continue actions were incorrectly pulling turn data from previous user actions
- **Root Cause**: Continue actions were adding turn data using the text from the last player action
- **Fix**: Prevented turn data addition for continue actions by adding `actionType !== "continue"` check
- **Code Changes**:
  - Modified `if (lastAction)` to `if (lastAction && actionType !== "continue")` in `output copy.js`

### 3. Enhanced Timestamp Cleanup
- **Issue**: Storycard timestamps were only cleaned up during adventure erasing, not always
- **Root Cause**: `cleanupStoryCardsByTimestamp` was only called in adventure erasing detection
- **Fix**: Moved cleanup call to run on every turn after time update to ensure future timestamps are always removed
- **Code Changes**:
  - Moved `cleanupStoryCardsByTimestamp(state.currentDate, state.currentTime)` from adventure erasing block to after time update in `context copy.js`

### 4. Previous Fixes (2.1.2)
- **Bug**: When erasing an action and doing a continue, the script was deleting all turn data from the WTG Data storycard, losing past story information.
- **Root Cause**: The cleanup function `cleanupWTGDataCardByTimestamp` was called during adventure erasing detection using `lastTT` (previous turn time), which could be 0 when no turn time markers were found, causing all turn data to be deleted.
- **Fix**: Moved the cleanup call to after time update in `context copy.js`, using `state.turnTime` (current turn time), and made it run always to ensure future turn data is cleaned up based on current time.
- **Code Changes**:
  - Removed `cleanupWTGDataCardByTimestamp(lastTT)` from adventure erasing block in `context copy.js`
  - Added `cleanupWTGDataCardByTimestamp(state.turnTime)` after time update in `context copy.js`

### 2. Previous Version Changes (2.1.0 - Dynamic Time Feature)

### 1. Added Dynamic Time Feature
- **New Feature**: Dynamic Time makes time progression adaptive to turn content instead of fixed
- **How it works**: Analyzes player input and AI response for keywords to determine time scale
  - Quick turns (dialogue): Time passes slower (0.5x multiplier)
  - Long turns (travel, waiting): Time passes faster (2.0x multiplier)
  - Medium turns: Normal time passage (1.0x multiplier)
- **Keywords**:
  - Quick: "say", "ask", "talk", "whisper", "reply"
  - Long: "journey", "travel", "wait", "sleep", "days", "hours"
- **Code Changes**:
  - Added `getDynamicTimeFactor()` function in `library copy.js`
  - Modified time calculation in `output copy.js` to apply dynamic factor when enabled

### 2. Added Enable/Disable Options
- **New Settings**:
  - "Enable Dynamic Time: true" - Controls whether dynamic time analysis is active
  - "Disable WTG Entirely: false" - Completely disables all WTG functionality when set to true
- **Code Changes**:
  - Updated `getWTGSettingsCard()` in `library copy.js` to include new settings
  - Added early return checks in all scripts (`output copy.js`, `input copy.js`, `context copy.js`) when WTG is disabled

### 3. LLM Time Commands
- **New Feature**: When Dynamic Time is enabled, LLM can trigger explicit time jumps using hidden commands
- **Context Injection**: When "Enable Dynamic Time" is true, this scratchpad is added to model context:
  ```
  <scratchpad>
  When the user decides to sleep on the previous turn, start the action with (sleep X units) where X is a number and units can be hours, minutes, days, weeks, months, or years. When a notable chunk of time passes in the adventure, start the action with (advance X units) using the same format.
  <scratchpad>
  ```
- **Command Detection**: Output hook detects leading (sleep X units) or (advance X units) commands
- **Supported Units**: hours, minutes, days, weeks, months, years (approximated: 1 month = 30 days, 1 year = 365 days)
- **Behavior**:
  - Time jump is applied immediately and supersedes charCount-based time for that turn
  - If Debug Mode is false, command is removed from final output text
  - If Debug Mode is true, command remains visible for testing
  - "sleep" and "advance" are blacklisted from storycard generation

### 5. AI Command Persistence and Cooldowns (2.1.5)
- **New Feature**: AI-generated (sleep) and (advance) commands are now persistent and have cooldowns to prevent repetition.
- **Data Model**:
  - Turn data: `aiCommand` object with type, quantity, unit, detectedAt, appliedAt
  - Session state: `lastCommand`, `limiters` (sleep/advance with revertAt, guidanceActive), `storycardCommandNotes`, `commandGuidance`
- **Command Detection**: Regex detects `(sleep X unit?)` or `(advance X unit?)` anywhere in AI output, normalizes units, defaults to 1 hour for sleep, 5 minutes for advance
- **Persistence**: Commands remain registered across turns; new commands overwrite previous state
- **Cooldowns**:
  - Sleep: Guidance switches to "Don't sleep" for 8 hours after wake-up timestamp
  - Advance: Guidance switches to "Don't advance" for 5 minutes after command application
- **Storycard Injection**: Current Date and Time card shows AI Command Status with timestamps and guidance
- **Output Sanitization**: Commands are unconditionally stripped from final narrative output
- **Improved Prompting**: Guidance instructs AI to use commands only for appropriate narrative moments, not during active scenes

### 4. Previous Version Changes (2.0.x)
- **Fixed Deprecation Logic**: Corrected deprecation to require both "Disable Generated Character Cards" and "Disable Generated Character Card Deletion" to be false
- **Consistent Setting Names**: Renamed "Disable Generated Location Cards" to "Enable Generated Location Cards"
- **Parentheses-Only Card Generation**: Disabled automatic character detection, now only creates cards from parentheses

## Settings Behavior
- **Time Duration Multiplier**: Multiplier for base time progression (default: 1.0; clamped >=0 to prevent backwards time; <1 slows, >1 speeds)
- **Disable Generated Character Cards**: Controls whether character card generation is disabled (true = disabled, false = enabled)
- **Enable Generated Location Cards**: Controls whether location card generation is enabled (true = enabled, false = disabled)
- **Disable Generated Character Card Deletion**: Controls whether deprecated character cards should be kept (true = keep, false = delete)
- **Debug Mode**: Enables debug output (true = enabled, false = disabled)
- **Enable Dynamic Time**: Controls whether dynamic time analysis is active (true = enabled, false = disabled)
- **Disable WTG Entirely**: Completely disables all WTG functionality (true = disabled, false = enabled)

## Files Modified
- `wtg_2.0/input copy.js`: Added cooldown tracking state variables
- `wtg_2.0/library copy.js`: Added AI command field to turn data, cooldown checking functions, timestamp injection in date/time card
- `wtg_2.0/context copy.js`: Implemented dynamic prompting based on cooldown state
- `wtg_2.0/output copy.js`: Added cooldown logic, fixed debug mode, updated turn data recording
- `wtg_2.0/Documentation.md`: Updated documentation with new features

## Previous Files Modified (2.1.0)
- `wtg_2.0/library copy.js`: Added new settings and `getDynamicTimeFactor()` function
- `wtg_2.0/output copy.js`: Added dynamic time calculation and disable check
- `wtg_2.0/input copy.js`: Added disable check
- `wtg_2.0/context copy.js`: Added disable check

## Testing Notes
- Test AI command cooldowns: After (sleep 2 hours), AI should receive "Don't sleep" instructions for 8 hours
- Test advance cooldowns: After (advance 10 minutes), AI should receive "Don't advance" instructions for 5 minutes
- Test timestamp injection: Current Date and Time storycard should show wake-up/advance timestamps
- Test debug mode: When Debug Mode is true, commands should be removed from final output
- Test turn data: WTG Data storycard should record AI commands in turn data
- Test command overwriting: New commands should replace previous cooldown timestamps
- Test dynamic prompting: AI instructions should change based on active cooldowns
## Revert Operation: 2025-09-23
- **Operation**: Reverted wtg_2.0 files to versions from Backup/wtg_2.1.4_depreciation_fix_2025-09-22
- **Files Reverted**: context copy.js, library copy.js, output copy.js
- **Reason**: To restore previous stable versions from the depreciation fix backup
- **Note**: input copy.js was not present in the backup and was not reverted