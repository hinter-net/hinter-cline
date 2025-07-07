# Instructions

This project is designed to work across all operating systems and be accessible to non-technical users.

## Installation

1. [Install `hinter-core` and run it in always restart mode.](https://github.com/bbenligiray/hinter-core/blob/main/instructions.md)

2. (OPTIONAL) The technically inclined may choose to build the Docker image locally.

3. Start `hinter-cline` in always restart mode using:
    ```sh
    docker run -d --name my-hinter-cline --restart=always -p8080:8080 -v"$(pwd)/hinter-core-data":/app/hinter-core-data bbenligiray/hinter-cline:0.0.1
    ```

4. Open your browser and navigate to [`localhost:8080`](http://localhost:8080) to see the VS Code interface.
    Since `hinter-cline` is running in always restart mode, VS Code will always be available at `localhost:8080`, even after you restart your machine.

5. Click the Cline icon on the VS Code sidebar.
    Select an API provider and enter your API key.

    If you are not a paid subscriber to any of these API providers, consider using one that offers a free trial for testing.
    For example:
    - Create an [OpenRouter](https://openrouter.ai/) account
    - Create an API key
    - Configure Cline to use [`deepseek/deepseek-chat-v3-0324:free`](https://openrouter.ai/deepseek/deepseek-chat-v3-0324:free)

## Working with Cline

There are two important concepts to know about Cline:

### Plan/Act toggle button

You can chat with Cline about the contents of your repo in Plan Mode.
For Cline to make changes (for example, to help you write a report draft), you will need to switch to Act Mode.
Switching between Plan and Act Mode retains the context, so you will likely want to switch between the two during use.

### Tasks

Whenever you want Cline to start as a clean slate, start a new task (for example, by clicking the plus sign on the Cline extension).
Doing this between independent hinter workflows will cause Cline to perform in a more consistent manner.
However, you may want to continue using the same task for dependent workflows, such as revising the same report multiple times.
