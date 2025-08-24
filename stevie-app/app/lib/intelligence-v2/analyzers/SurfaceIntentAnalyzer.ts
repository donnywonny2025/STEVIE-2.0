/**
 * SurfaceIntentAnalyzer - Social Pattern and Politeness Detection
 * 
 * Specialized analyzer that detects social wrappers, politeness markers,
 * and surface-level interaction patterns. This is the first layer of
 * Scout's multi-pass analysis approach.
 * 
 * Key Responsibilities:
 * - Detect greeting patterns and social interactions
 * - Identify politeness markers and courtesy expressions
 * - Recognize conversational flow indicators
 * - Assess social context requirements
 */

import type {
  IntentLayer,
  TechnicalSignal
} from '../types/IntelligenceTypes';

export interface SocialPattern {
  pattern: RegExp;
  type: SocialPatternType;
  weight: number;
  examples: string[];
  response_hint?: string;
}

export type SocialPatternType = 
  | 'greeting' 
  | 'farewell' 
  | 'gratitude' 
  | 'politeness' 
  | 'acknowledgment' 
  | 'apology' 
  | 'request_help' 
  | 'small_talk' 
  | 'encouragement'
  | 'confusion'
  | 'frustration';

export interface SurfaceAnalysisResult extends IntentLayer {
  socialPatterns: SocialPatternMatch[];
  politenessLevel: number;
  conversationalTone: 'formal' | 'casual' | 'friendly' | 'urgent' | 'confused';
  requiresSocialResponse: boolean;
  suggestedTone: 'professional' | 'friendly' | 'helpful' | 'encouraging';
}

export interface SocialPatternMatch {
  type: SocialPatternType;
  pattern: string;
  confidence: number;
  matchedText: string;
  position: 'start' | 'middle' | 'end';
}

export class SurfaceIntentAnalyzer {
  private socialPatterns: SocialPattern[] = [
    // Greetings
    {
      pattern: /^(hi|hello|hey|sup|what's up|good morning|good afternoon|good evening|greetings)/i,
      type: 'greeting',
      weight: 0.9,
      examples: ['hi', 'hello there', 'hey!', 'good morning'],
      response_hint: 'Respond with friendly greeting and offer help'
    },
    {
      pattern: /(hi|hello|hey) (there|again|steve|assistant)/i,
      type: 'greeting',
      weight: 0.8,
      examples: ['hi there', 'hello Steve', 'hey assistant'],
      response_hint: 'Personal greeting - respond warmly'
    },

    // Farewells
    {
      pattern: /^(bye|goodbye|see you|thanks and goodbye|have a good|take care)/i,
      type: 'farewell',
      weight: 0.9,
      examples: ['bye', 'goodbye', 'see you later', 'take care'],
      response_hint: 'Acknowledge farewell and offer future help'
    },

    // Gratitude
    {
      pattern: /(thank you|thanks|thx|appreciated|grateful|awesome)/i,
      type: 'gratitude',
      weight: 0.8,
      examples: ['thank you', 'thanks so much', 'really appreciated'],
      response_hint: 'Acknowledge thanks and offer continued help'
    },
    {
      pattern: /(that was|you are|this is) (helpful|amazing|perfect|great|awesome)/i,
      type: 'gratitude',
      weight: 0.7,
      examples: ['that was helpful', 'you are amazing', 'this is perfect'],
      response_hint: 'Express pleasure in helping'
    },

    // Politeness markers
    {
      pattern: /(please|could you|would you|if you could|if possible)/i,
      type: 'politeness',
      weight: 0.6,
      examples: ['please help', 'could you assist', 'if you could'],
      response_hint: 'Match politeness level in response'
    },
    {
      pattern: /(excuse me|pardon|sorry to bother|hope you don't mind)/i,
      type: 'politeness',
      weight: 0.7,
      examples: ['excuse me', 'sorry to bother you', 'hope you don\'t mind'],
      response_hint: 'Reassure that help is welcome'
    },

    // Acknowledgments
    {
      pattern: /^(ok|okay|alright|got it|understood|makes sense|i see)/i,
      type: 'acknowledgment',
      weight: 0.8,
      examples: ['ok', 'got it', 'makes sense', 'I understand'],
      response_hint: 'Confirm understanding and offer next steps'
    },
    {
      pattern: /(yes|yeah|yep|sure|sounds good|that works)/i,
      type: 'acknowledgment',
      weight: 0.7,
      examples: ['yes', 'sounds good', 'that works for me'],
      response_hint: 'Proceed with confidence'
    },

    // Apologies
    {
      pattern: /(sorry|my bad|apologies|my mistake|oops)/i,
      type: 'apology',
      weight: 0.7,
      examples: ['sorry', 'my bad', 'apologies for the confusion'],
      response_hint: 'Reassure and help move forward'
    },

    // Help requests
    {
      pattern: /(help|assist|support|guidance|advice)/i,
      type: 'request_help',
      weight: 0.6,
      examples: ['need help', 'can you assist', 'looking for guidance'],
      response_hint: 'Express eagerness to help'
    },
    {
      pattern: /(can you|are you able to|is it possible to)/i,
      type: 'request_help',
      weight: 0.5,
      examples: ['can you help', 'are you able to assist'],
      response_hint: 'Confirm capability and willingness'
    },

    // Small talk
    {
      pattern: /(how are you|how's it going|how have you been|what's new)/i,
      type: 'small_talk',
      weight: 0.8,
      examples: ['how are you', 'how\'s it going today'],
      response_hint: 'Brief positive response, redirect to help'
    },

    // Encouragement
    {
      pattern: /(great job|well done|excellent|perfect|brilliant)/i,
      type: 'encouragement',
      weight: 0.7,
      examples: ['great job', 'that\'s perfect', 'excellent work'],
      response_hint: 'Accept encouragement gracefully'
    },

    // Confusion
    {
      pattern: /(confused|don't understand|not sure|unclear|lost)/i,
      type: 'confusion',
      weight: 0.8,
      examples: ['I\'m confused', 'don\'t understand', 'this is unclear'],
      response_hint: 'Offer clarification and simpler explanation'
    },
    {
      pattern: /(what do you mean|can you explain|i don't get it)/i,
      type: 'confusion',
      weight: 0.9,
      examples: ['what do you mean', 'can you explain that'],
      response_hint: 'Provide detailed explanation'
    },

    // Frustration
    {
      pattern: /(frustrated|annoying|not working|broken|stupid)/i,
      type: 'frustration',
      weight: 0.8,
      examples: ['this is frustrating', 'it\'s not working', 'this is broken'],
      response_hint: 'Acknowledge frustration and offer calm help'
    },
    {
      pattern: /(argh|ugh|damn|why won't|this sucks)/i,
      type: 'frustration',
      weight: 0.9,
      examples: ['argh!', 'why won\'t this work', 'this sucks'],
      response_hint: 'Empathize and provide patient assistance'
    }
  ];

  /**
   * Main surface analysis method
   */
  async analyze(query: string): Promise<SurfaceAnalysisResult> {
    const startTime = Date.now();
    
    // Find all social pattern matches
    const socialPatterns = this.findSocialPatterns(query);
    
    // Calculate politeness level
    const politenessLevel = this.calculatePolitenessLevel(socialPatterns, query);
    
    // Determine conversational tone
    const conversationalTone = this.determineConversationalTone(socialPatterns, query);
    
    // Check if social response is required
    const requiresSocialResponse = this.requiresSocialResponse(socialPatterns);
    
    // Suggest appropriate response tone
    const suggestedTone = this.suggestResponseTone(socialPatterns, conversationalTone);
    
    // Calculate overall confidence
    const confidence = this.calculateSurfaceConfidence(socialPatterns, query);
    
    // Determine intent type
    const type = this.determineSurfaceIntentType(socialPatterns);
    
    // Extract indicators
    const indicators = socialPatterns.map(match => 
      `${match.type}:${match.matchedText.slice(0, 15)}`
    );

    const result: SurfaceAnalysisResult = {
      type,
      confidence,
      indicators,
      socialPatterns,
      politenessLevel,
      conversationalTone,
      requiresSocialResponse,
      suggestedTone
    };

    console.log(`🏄 SURFACE ANALYSIS (${Date.now() - startTime}ms):`, {
      type: result.type,
      confidence: result.confidence.toFixed(3),
      socialPatterns: result.socialPatterns.length,
      tone: result.conversationalTone,
      politeness: result.politenessLevel.toFixed(2),
      requiresSocial: result.requiresSocialResponse
    });

    return result;
  }

  /**
   * Find social pattern matches in the query
   */
  private findSocialPatterns(query: string): SocialPatternMatch[] {
    const matches: SocialPatternMatch[] = [];
    const lowerQuery = query.toLowerCase();
    
    for (const socialPattern of this.socialPatterns) {
      const match = socialPattern.pattern.exec(lowerQuery);
      if (match) {
        const matchedText = match[0];
        const position = this.getMatchPosition(match.index, query.length);
        
        matches.push({
          type: socialPattern.type,
          pattern: socialPattern.pattern.source,
          confidence: socialPattern.weight,
          matchedText,
          position
        });
      }
    }
    
    // Sort by confidence (highest first)
    matches.sort((a, b) => b.confidence - a.confidence);
    
    return matches;
  }

  /**
   * Calculate politeness level (0-1 scale)
   */
  private calculatePolitenessLevel(matches: SocialPatternMatch[], query: string): number {
    let politenessScore = 0;
    
    // Base politeness from pattern matches
    for (const match of matches) {
      if (match.type === 'politeness') {
        politenessScore += match.confidence * 0.4;
      } else if (match.type === 'gratitude') {
        politenessScore += match.confidence * 0.3;
      } else if (match.type === 'apology') {
        politenessScore += match.confidence * 0.2;
      }
    }
    
    // Additional politeness indicators
    const additionalMarkers = [
      /\bplease\b/i,
      /\bthank you\b/i,
      /\bif you (could|would|don't mind)\b/i,
      /\bi would appreciate\b/i,
      /\bkindly\b/i
    ];
    
    for (const marker of additionalMarkers) {
      if (marker.test(query)) {
        politenessScore += 0.1;
      }
    }
    
    return Math.min(politenessScore, 1.0);
  }

  /**
   * Determine conversational tone
   */
  private determineConversationalTone(
    matches: SocialPatternMatch[], 
    query: string
  ): 'formal' | 'casual' | 'friendly' | 'urgent' | 'confused' {
    // Check for urgency indicators
    const urgencyMarkers = [
      /urgent|asap|immediately|quickly|emergency|critical/i,
      /!!+/,
      /HELP/,
      /broken|not working|failed/i
    ];
    
    for (const marker of urgencyMarkers) {
      if (marker.test(query)) {
        return 'urgent';
      }
    }
    
    // Check for confusion
    const hasConfusion = matches.some(match => match.type === 'confusion');
    if (hasConfusion) {
      return 'confused';
    }
    
    // Check for formal indicators
    const formalMarkers = [
      /would you kindly/i,
      /i would like to request/i,
      /could you please provide/i,
      /i am writing to/i
    ];
    
    for (const marker of formalMarkers) {
      if (marker.test(query)) {
        return 'formal';
      }
    }
    
    // Check for casual indicators
    const casualMarkers = [
      /hey|sup|what's up/i,
      /gonna|wanna|dunno/i,
      /lol|haha|😊|😄|👍/i
    ];
    
    for (const marker of casualMarkers) {
      if (marker.test(query)) {
        return 'casual';
      }
    }
    
    // Check for friendly indicators
    const hasFriendlyPatterns = matches.some(match => 
      ['greeting', 'gratitude', 'encouragement'].includes(match.type)
    );
    
    if (hasFriendlyPatterns) {
      return 'friendly';
    }
    
    return 'casual'; // Default tone
  }

  /**
   * Check if query requires a social response
   */
  private requiresSocialResponse(matches: SocialPatternMatch[]): boolean {
    const socialTypes: SocialPatternType[] = [
      'greeting', 'farewell', 'gratitude', 'small_talk', 'encouragement'
    ];
    
    return matches.some(match => socialTypes.includes(match.type));
  }

  /**
   * Suggest appropriate response tone
   */
  private suggestResponseTone(
    matches: SocialPatternMatch[], 
    conversationalTone: string
  ): 'professional' | 'friendly' | 'helpful' | 'encouraging' {
    // Check for frustration or confusion - use encouraging tone
    if (matches.some(match => ['frustration', 'confusion'].includes(match.type))) {
      return 'encouraging';
    }
    
    // Match the user's tone
    switch (conversationalTone) {
      case 'formal':
        return 'professional';
      case 'friendly':
      case 'casual':
        return 'friendly';
      case 'urgent':
      case 'confused':
        return 'helpful';
      default:
        return 'friendly';
    }
  }

  /**
   * Calculate overall surface confidence
   */
  private calculateSurfaceConfidence(matches: SocialPatternMatch[], query: string): number {
    if (matches.length === 0) {
      return 0.1; // Low confidence if no social patterns
    }
    
    // Base confidence from strongest match
    const maxConfidence = Math.max(...matches.map(m => m.confidence));
    
    // Boost for multiple matches
    const multipleMatchBonus = Math.min(matches.length * 0.1, 0.3);
    
    // Boost for patterns at start of query (stronger social signal)
    const startPatternBonus = matches.some(m => m.position === 'start') ? 0.2 : 0;
    
    // Query length factor (shorter social queries are often more reliable)
    const lengthFactor = query.length < 50 ? 0.1 : 0;
    
    return Math.min(maxConfidence + multipleMatchBonus + startPatternBonus + lengthFactor, 1.0);
  }

  /**
   * Determine surface intent type based on pattern matches
   */
  private determineSurfaceIntentType(matches: SocialPatternMatch[]): 'social' | 'technical' | 'continuation' | 'complex' {
    if (matches.length === 0) {
      return 'technical'; // No social patterns = likely technical
    }
    
    // Strong social indicators
    const strongSocialTypes: SocialPatternType[] = [
      'greeting', 'farewell', 'gratitude', 'small_talk'
    ];
    
    if (matches.some(match => strongSocialTypes.includes(match.type))) {
      return 'social';
    }
    
    // Help requests might be technical
    if (matches.some(match => match.type === 'request_help')) {
      return 'technical';
    }
    
    // Acknowledgments suggest continuation
    if (matches.some(match => match.type === 'acknowledgment')) {
      return 'continuation';
    }
    
    return 'social'; // Default for other social patterns
  }

  /**
   * Get position of match in query
   */
  private getMatchPosition(index: number, queryLength: number): 'start' | 'middle' | 'end' {
    const relativePosition = index / queryLength;
    
    if (relativePosition < 0.2) return 'start';
    if (relativePosition > 0.8) return 'end';
    return 'middle';
  }

  /**
   * Get social response suggestions
   */
  getSocialResponseSuggestions(analysis: SurfaceAnalysisResult): string[] {
    const suggestions: string[] = [];
    
    for (const pattern of analysis.socialPatterns) {
      const socialPattern = this.socialPatterns.find(p => p.type === pattern.type);
      if (socialPattern?.response_hint) {
        suggestions.push(socialPattern.response_hint);
      }
    }
    
    return [...new Set(suggestions)]; // Remove duplicates
  }

  /**
   * Get pattern statistics for monitoring
   */
  getPatternStats(): {
    totalPatterns: number;
    patternTypes: Record<SocialPatternType, number>;
    mostCommonPatterns: Array<{ type: SocialPatternType; count: number }>;
  } {
    const patternTypes = this.socialPatterns.reduce((acc, pattern) => {
      acc[pattern.type] = (acc[pattern.type] || 0) + 1;
      return acc;
    }, {} as Record<SocialPatternType, number>);

    const mostCommonPatterns = Object.entries(patternTypes)
      .map(([type, count]) => ({ type: type as SocialPatternType, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalPatterns: this.socialPatterns.length,
      patternTypes,
      mostCommonPatterns
    };
  }
}