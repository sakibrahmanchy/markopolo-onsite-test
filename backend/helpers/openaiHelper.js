const { OpenAI } = require("openai");

class OpenAIHelper {
  constructor() {
    this.apiKey = process.env.OPENAI_KEY;
    this.model = process.env.OPENAI_MODEL || "gpt-4o-mini-2024-07-18";
    
    this.validateConfig();
    
    this.openai = new OpenAI({
      apiKey: this.apiKey,
      ...(this.baseURL && { baseURL: this.baseURL })
    });
  }

  async createCompletion(systemPrompt, userMessage, responseFormat, temperature = 0.1) {
    try {
      const requestBody = {
        model: this.model,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userMessage,
          },
        ],
        temperature,
      };

      // Add response format if provided
      if (responseFormat) {
        requestBody.response_format = { 
          type: "json_schema", 
          json_schema: responseFormat 
        };
      }

      const response = await this.openai.chat.completions.create(requestBody);
      return response;
    } catch (error) {
      throw new Error(`OpenAI completion failed: ${error.message}`);
    }
  }

  validateConfig() {
    if (!this.apiKey) {
      throw new Error("OpenAI API key is required. Please set OPENAI_KEY environment variable.");
    }
    return true;
  }

  static isConfigured() {
    return !!(process.env.OPENAI_KEY);
  }
}

module.exports = OpenAIHelper;
