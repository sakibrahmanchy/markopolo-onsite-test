require("dotenv").config();
const express = require("express");
const cors = require("cors");
const Joi = require("joi");
const OpenAIHelper = require("./helpers/openaiHelper");

const app = express();

app.use(cors());
app.use(express.json());

let openaiHelper;
try {
  if (OpenAIHelper.isConfigured()) {
    openaiHelper = new OpenAIHelper();
    console.log("OpenAI helper initialized successfully");
  } else {
    console.warn("OpenAI not configured - API endpoints will return errors");
  }
} catch (error) {
  console.error("OpenAI configuration error:", error.message);
}

const analyzeSubjectSchema = Joi.object({
  subject: Joi.string()
    .trim()
    .min(1)
    .max(200)
    .required()
    .messages({
      'string.empty': 'Subject cannot be empty',
      'string.min': 'Subject must be at least 1 character long',
      'string.max': 'Subject cannot exceed 200 characters',
      'any.required': 'Subject is required'
    }),
  industry: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Industry cannot be empty',
      'string.min': 'Industry must be at least 1 character long',
      'string.max': 'Industry cannot exceed 100 characters',
      'any.required': 'Industry is required'
    })
});

const EMAIL_ANALYSIS_RESPONSE_FORMAT = {
  name: "email-subject-analyzer",
  schema: {
    type: "object",
    properties: {
      original: { type: "string" },
      score: { type: "number" },
      issues: {
        type: "array",
        items: {
          type: "string",
        },
      },
      suggestions: {
        type: "array",
        items: {
          type: "string",
        },
      },
      ai_insights: { type: "string" },
    },
  },
};

const generateEmailAnalysisPrompt = (industry) => {
  return `You are an expert email marketing specialist and subject line analyzer. Your job is to analyze email subject lines and provide actionable feedback.

For the given subject line in the ${industry} industry, please:
1. Rate the subject line from 0-100 based on effectiveness
2. Identify specific issues that could hurt performance
3. Provide 3 alternative subject line suggestions that are more engaging
4. Give AI-powered insights on how to improve email marketing performance

Focus on:
- Clarity and readability
- Emotional engagement
- Industry relevance
- Avoiding spam triggers
- Creating urgency without being pushy
- Personalization opportunities

Respond in the exact JSON format specified.`;
};


app.post("/api/analyze-subject", async (req, res) => {
  try {
    // Validate request body using Joi
    const { error, value } = analyzeSubjectSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        error: "Validation failed",
        details: error.details.map(detail => detail.message)
      });
    }

    const { subject, industry } = value;

    if (!openaiHelper) {
      return res.status(500).json({
        error: "OpenAI service is not available",
      });
    }

    const systemPrompt = generateEmailAnalysisPrompt(industry);
    const userMessage = `Analyze this email subject line for the ${industry} industry: "${subject}"`;
      
    const response = await openaiHelper.createCompletion(
      systemPrompt, 
      userMessage, 
      EMAIL_ANALYSIS_RESPONSE_FORMAT
    );

    
    const analysis = JSON.parse(response.choices[0].message.content);
    
    res.json(analysis);
  } catch (error) {
    console.error("Error analyzing subject line:", error);
    res.status(500).json({
      error: "Failed to analyze subject line",
      details: error.message,
    });
  }
});

app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
