import { Request, Response } from "express";

export async function improveSection(
  req: Request,
  res: Response
) {
  try {
    const {
      section,
      content,
    } = req.body;

    if (!section || !content) {
      return res.status(400).json({
        error:
          "Section and content required",
      });
    }

    // Temporary response
    return res.json({
      improved: `
Professionally enhanced ${section}:

${content}
      `,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error:
        "Failed to improve content",
    });
  }
}
