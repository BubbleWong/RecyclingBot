# RecyclingBot

An AI-powered Progressive Web App (PWA) that helps users classify recycling items in Ottawa, Ontario.

## Demo

**Try it here:** [https://recycle.bubbleh.com/](https://recycle.bubbleh.com/)

## Features

-   **AI Classification**: Uses advanced AI models (Gemini / ChatGPT) to identify waste items from photos.
-   **PWA Support**: Installable on iOS and Android with offline capabilities.
-   **Real-time Feedback**: Instant classification into Blue Bin, Black Bin, Green Bin, or Garbage.
-   **Optimized Performance**: Client-side image resizing and smart caching for fast load times.

## Tech Stack

-   **Backend**: Node.js, [Koa](https://koajs.com/)
-   **AI Integration**: [OpenAI SDK](https://github.com/openai/openai-node) (via OpenRouter)
-   **Frontend**: Vanilla HTML, CSS (Glassmorphism), JavaScript
-   **PWA**: Service Worker, Web App Manifest
-   **Testing**: Custom test suite (`test.mjs`)

## How to Deploy

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/BubbleWong/RecyclingBot.git
    cd RecyclingBot
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Configure Environment**:
    -   Copy `config.json.sample` to `config.json`.
    -   Add your `OPENROUTER_API_KEY` to `config.json`.

    ```json
    {
      "OPENROUTER_API_KEY": "your_api_key_here"
    }
    ```

4.  **Start the server**:
    ```bash
    npm start
    ```

5.  **Access the app**:
    Open your browser and navigate to `http://localhost:3000`.

## License

MIT License. See [LICENSE](LICENSE) for details.

## Author

Baobao Huang
