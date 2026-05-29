import { toast } from 'sonner';
import { ResumeData } from '../types';
import { apiFetch } from './api';
import { GoogleGenerativeAI } from '@google/generative-ai';

// SECURITY WARNING: Storing and using your Gemini API key in client-side environment variables
// (like VITE_GEMINI_API_KEY) exposes the key to any user visiting the application in their browser.
// Ensure your API key has appropriate GCP restrictions or is kept purely server-side for production.

export interface ChatMessage {
  role: 'user' | 'model';
  parts: [{ text: string }];
}

export async function sendChatMessage(message: string, history: ChatMessage[] = [], systemInstruction?: string) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';

  if (!apiKey) {
    const errorMsg = 'VITE_GEMINI_API_KEY has not been configured in your Secrets/Environment settings.';
    console.error(errorMsg);
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    ...(systemInstruction ? { systemInstruction } : {})
  });

  const promise = (async () => {
    if (history && history.length > 0) {
      const chat = model.startChat({
        history: history.map(h => ({
          role: h.role,
          parts: h.parts.map(p => ({ text: p.text }))
        }))
      });
      const result = await chat.sendMessage(message);
      return { text: result.response.text() || '' };
    } else {
      const result = await model.generateContent(message);
      return { text: result.response.text() || '' };
    }
  })();

  toast.promise(promise, {
    loading: 'Generating AI Response (Client SDK)...',
    success: 'AI Response compiled!',
    error: 'Failed to generate AI response. Please verify VITE_GEMINI_API_KEY.',
  });

  return promise;
}

export async function generateResumeContent(data: ResumeData) {
  const fullName = data.personalInfo?.fullName?.trim() || "Candidate";
  const headline = data.personalInfo?.headline?.trim() || "Full Stack Developer";

  const prompt = `You are a world-class senior resume writer. Create a highly professional, ATS-friendly resume.

Return **ONLY valid JSON**. No markdown block formatting, no extra commentary, no explanations. 

Ensure the output is robust, matching this interface:
{
  "name": "${fullName}",
  "headline": "${headline}",
  "summary": "Professional summary paragraph. 1st person implied, telemetry-free, recruiter-attractive.",
  "experience": [
    {
      "company": "Company Name",
      "role": "Job Title",
      "startDate": "Start Date (e.g., Oct 2021)",
      "endDate": "End Date or Present",
      "bullets": [
        "First professional achievement bullet starting with active verb and including result/impact. At least 12-25 words.",
        "Second professional achievement bullet starting with active verb."
      ]
    }
  ],
  "skills": ["TypeScript", "React", "Node.js"],
  "education": [
    {
      "school": "University Name",
      "degree": "Degree Title",
      "year": "Graduation Year"
    }
  ],
  "projects": [
    {
      "name": "Project Name",
      "bullets": ["First project achievement bullet.", "Second project bullet."],
      "technologies": ["React", "Tailwind CSS"]
    }
  ]
}

CRITICAL RULES:
1. DO NOT include candidate name, resume title, section headings, or markdown headings inside the generated string text values.
2. Only generate pure content for each section. For example, "summary" must contain ONLY summary text (no header title), "experience" bullets must contain ONLY the bullet text themselves (no asterisks, lists, etc.).
3. Keep experience bullets professional and achievement-oriented (Action Verb + Responsibility + Result + Impact). Each bullet must contain at least 12-20 words.
4. If some lists in user data are empty, professionally expand them based on target role or keep them aligned with target profile.

User Data:
${JSON.stringify(data, null, 2)}`;

  const systemInstruction = `Always output clean, professional structured JSON only. Never output Markdown prose or explanations. Follow the exact JSON schema requested.`;

  const response = await sendChatMessage(prompt, [], systemInstruction);
  return response.text;
}

export async function analyzeResume(resumeText: string, jobDescription?: string) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';

  if (!apiKey) {
    const errorMsg = 'VITE_GEMINI_API_KEY has not been configured in your Secrets/Environment settings.';
    console.error(errorMsg);
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
  });

  const prompt = `You are Jobspark.AI, an expert ATS resume optimizer and executive recruiter.
Analyze this resume text and provide a comprehensive feedback assessment.
If a Job Description is provided, also perform an ATS match comparison.

Resume Text:
${resumeText}

${jobDescription ? `Job Description:\n${jobDescription}\n` : ''}

You must return a raw JSON object matching this structure:
{
  "atsScore": 85,
  "recruiterImpressionScore": 80,
  "missingKeywords": ["TypeScript", "Docker"],
  "improvementSuggestions": ["Add metrics/percentages to work bullets", "Expand professional summary"],
  "weakSections": ["Projects", "Awards"],
  "matchScore": 75,
  "feedback": "Your resume has a strong foundation, but..."
}

Ensure values are objective and useful.
IMPORTANT: Return ONLY the JSON object. Do not wrap the JSON output in markdown code blocks or any other commentary.`;

  const promise = (async () => {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const responseText = result.response.text();
    try {
      const cleaned = responseText.replace(/^```json/i, '').replace(/```$/i, '').trim();
      return JSON.parse(cleaned);
    } catch (parseError) {
      console.error('JSON parsing failed. Attempting to extract JSON substring.', parseError);
      const jsonStart = responseText.indexOf('{');
      const jsonEnd = responseText.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        return JSON.parse(responseText.substring(jsonStart, jsonEnd + 1));
      }
      throw new Error('AI returned an invalid JSON structure.');
    }
  })();

  toast.promise(promise, {
    loading: 'Analyzing resume with AI models (Client SDK)...',
    success: 'Deep analysis completed successfully!',
    error: (err) => `Analysis failed: ${err.message || 'Client SDK error'}`,
  });

  return promise;
}

export async function improveSection(section: string, content: string) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';

  if (!apiKey) {
    const errorMsg = 'VITE_GEMINI_API_KEY has not been configured in your Secrets/Environment settings.';
    console.error(errorMsg);
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
  });

  const prompt = `You are a world-class senior resume editor and career advisor.
Professionally rewrite and improve the following resume ${section} text to make it sound achievement-oriented, metrics-driven, recruiter-attractive, and ATS-optimized.
Maintain truthfulness, improve flow, and correct any grammatical errors.

Original Content:
${content}

Return ONLY the improved text. Do not provide preface, notes, lists, or markdown wrapper blocks. Just raw, polished paragraphs ready to be pasted inside the resume.`;

  const promise = (async () => {
    const result = await model.generateContent(prompt);
    return { improved: result.response.text()?.trim() || content };
  })();

  toast.promise(promise, {
    loading: 'Generating professionally enhanced text (Client SDK)...',
    success: 'Content enhanced successfully!',
    error: 'Failed to enhance content.',
  });

  return promise;
}
