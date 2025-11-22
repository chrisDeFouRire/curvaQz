## ADDED Requirements

### Requirement: Quiz play interface
The system SHALL provide a web interface (`/play`) where users can start and complete a quiz, with questions displayed one at a time, answer options shown, and immediate feedback on selections.

#### Scenario: Start quiz from landing page
- **GIVEN** user is on the landing page
- **WHEN** user clicks "Start Quiz" or equivalent CTA
- **THEN** the interface navigates to `/play` and initiates quiz generation

#### Scenario: Display first question after generation
- **GIVEN** quiz has been generated successfully
- **WHEN** the generation API responds with questions
- **THEN** the first question is displayed with shuffled answer options

#### Scenario: Navigate between questions
- **GIVEN** user has answered a question
- **WHEN** user clicks "Next" or the interface auto-advances
- **THEN** the next question is displayed with progress indication

### Requirement: Answer interaction and validation
The system SHALL allow users to select answers, provide immediate visual feedback on correctness, track score, and prevent answer changes after submission.

#### Scenario: Select and submit answer
- **GIVEN** a question is displayed with multiple options
- **WHEN** user clicks/taps an answer option
- **THEN** the selection is highlighted and answer correctness is shown

#### Scenario: Score tracking
- **GIVEN** user has answered multiple questions
- **WHEN** correct answers are identified
- **THEN** running score is maintained and displayed in results

#### Scenario: Prevent answer changes
- **GIVEN** user has selected an answer
- **WHEN** user attempts to change selection
- **THEN** the original selection is maintained (no changes allowed)

### Requirement: Quiz completion and results
The system SHALL display final results after all questions are answered, showing score breakdown, correct answers, and option to play again.

#### Scenario: Show results screen
- **GIVEN** all questions have been answered
- **WHEN** the quiz reaches completion
- **THEN** results screen displays total score, percentage correct, and answer breakdown

#### Scenario: Play again functionality
- **GIVEN** results are displayed
- **WHEN** user clicks "Play Again"
- **THEN** a new quiz is generated and the flow restarts

#### Scenario: Indicate quiz source
- **GIVEN** quiz has been generated (mock or live)
- **WHEN** results are displayed
- **THEN** the quiz source is indicated (for transparency in development)

### Requirement: Error handling and loading states
The system SHALL handle API failures gracefully, show loading states during quiz generation, and provide clear error messages with retry options.

#### Scenario: Handle generation failure
- **GIVEN** quiz generation API call fails
- **WHEN** error occurs
- **THEN** user-friendly error message is shown with retry option

#### Scenario: Loading during generation
- **GIVEN** quiz generation is in progress
- **WHEN** API call is pending
- **THEN** loading indicator is shown with appropriate messaging

#### Scenario: Network interruptions
- **GIVEN** network connection is lost during quiz
- **WHEN** user attempts to continue
- **THEN** appropriate error handling guides user to retry or restart
