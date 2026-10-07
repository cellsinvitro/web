/**
 * Utility for parsing word count, estimated page count, and citations from uploaded .docx files.
 */

export interface DocStats {
  wordCount: number;
  estimatedPages: number;
  citationCount: number;
  success: boolean;
  message?: string;
}

export async function parseDocxFile(file: File): Promise<DocStats> {
  const fileName = file.name.toLowerCase();

  // If file is legacy .doc or non-docx, return success: false to fallback to manual input
  if (fileName.endsWith(".doc") && !fileName.endsWith(".docx")) {
    return {
      wordCount: 0,
      estimatedPages: 0,
      citationCount: 0,
      success: false,
      message: "Legacy .doc format detected. Please enter word/page count manually or convert to .docx for auto-detection.",
    };
  }

  if (!fileName.endsWith(".docx")) {
    return {
      wordCount: 0,
      estimatedPages: 0,
      citationCount: 0,
      success: false,
      message: "Unsupported file format for auto-detection. Only .docx files can be auto-analyzed.",
    };
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const textDecoder = new TextDecoder("utf-8");
    const rawText = textDecoder.decode(arrayBuffer);

    // Extract text inside <w:t> tags from word/document.xml in raw zip content
    const wtMatches = rawText.match(/<w:t[^>]*>(.*?)<\/w:t>/gi);

    let fullExtractedText = "";
    if (wtMatches && wtMatches.length > 0) {
      fullExtractedText = wtMatches
        .map((tag) => tag.replace(/<[^>]+>/g, ""))
        .join(" ");
    } else {
      // Fallback: strip XML/HTML-like tags from raw decoded string if readable
      const printableText = rawText.replace(/[\x00-\x1F\x7F-\x9F]/g, " ");
      const textMatches = printableText.match(/([a-zA-Z0-9'’\-]{2,}\s+){3,}/g);
      if (textMatches) {
        fullExtractedText = textMatches.join(" ");
      }
    }

    // Clean text and calculate word count
    const cleanedText = fullExtractedText.replace(/\s+/g, " ").trim();
    const words = cleanedText
      ? cleanedText.split(/\s+/).filter((w) => w.length > 0 && /[a-zA-Z0-9]/.test(w))
      : [];
    const wordCount = words.length;

    if (wordCount === 0) {
      return {
        wordCount: 0,
        estimatedPages: 0,
        citationCount: 0,
        success: false,
        message: "Could not auto-detect text. Please enter word/page count manually.",
      };
    }

    // Estimate pages (standard academic density ~ 250 words/page)
    const estimatedPages = Math.max(1, Math.ceil(wordCount / 250));

    // Detect citations (matches e.g. [1], [1-4], (Smith et al., 2021), (Jones, 2019))
    const citationRegex = /\((?:[A-Z][a-zA-Z\s.\-']+(?:\s+et\s+al\.)?,\s*\d{4}[a-z]?)\)|\[\d+(?:--?\d+)?\]/g;
    const citationMatches = cleanedText.match(citationRegex) || [];
    const citationCount = citationMatches.length;

    return {
      wordCount,
      estimatedPages,
      citationCount: Math.max(citationCount, 0),
      success: true,
      message: `Auto-detected ${wordCount.toLocaleString()} words, ~${estimatedPages} pages, and ${citationCount} citations.`,
    };
  } catch (error) {
    console.error("Error parsing docx file:", error);
    return {
      wordCount: 0,
      estimatedPages: 0,
      citationCount: 0,
      success: false,
      message: "Auto-detection encountered an error. Please enter quantities manually.",
    };
  }
}
