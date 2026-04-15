// Scam Detection Pattern Engine
// Uses pattern matching to identify potential scams and calculate risk scores

export interface ScamAnalysisResult {
  riskScore: number // 0-100
  riskLevel: 'safe' | 'low' | 'medium' | 'high' | 'critical'
  patterns: DetectedPattern[]
  explanation: string
  recommendations: string[]
}

export interface DetectedPattern {
  name: string
  confidence: number // 0-100
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
}

// Scam indicator patterns
const scamPatterns = {
  urgency: {
    keywords: [
      'urgent', 'immediately', 'act now', 'limited time', 'expires soon',
      'verify now', 'confirm identity', 'update payment', 'critical alert',
      'click here now', 'don\'t delay', 'act fast', 'hurry', 'deadline'
    ],
    weight: 15,
    severity: 'high' as const,
  },
  financial_threats: {
    keywords: [
      'account suspended', 'locked', 'unauthorized', 'fraud detected',
      'confirm payment', 'billing problem', 'security alert', 'unusual activity',
      'update card', 'verify bank', 'confirm transaction'
    ],
    weight: 20,
    severity: 'high' as const,
  },
  impersonation: {
    keywords: [
      'dear customer', 'valued member', 'dear user', 'dear account holder',
      'official notice', 'from your bank', 'from paypal', 'from amazon',
      'technical support', 'customer service'
    ],
    weight: 18,
    severity: 'high' as const,
  },
  suspicious_requests: {
    keywords: [
      'otp', 'password', 'pin', 'cvv', 'credit card', 'social security',
      'send money', 'wire transfer', 'gift card', 'itunes card',
      'google play', 'verify details', 'confirm credentials'
    ],
    weight: 22,
    severity: 'critical' as const,
  },
  generic_greetings: {
    keywords: [
      'dear sir', 'dear madam', 'greetings', 'hello there', 'to whom it may concern'
    ],
    weight: 12,
    severity: 'medium' as const,
  },
  poor_english: {
    patterns: [
      /(\w+)\s+\1{2,}/, // repeated words
      /[A-Z]{5,}/, // excessive caps
      /(their|there|they're)\s+mixed|confused/, // common errors
    ],
    weight: 8,
    severity: 'low' as const,
  },
}

const urlPatterns = {
  suspicious: {
    patterns: [
      /bit\.ly/i,
      /bitly\./i,
      /tinyurl\./i,
      /short\.link/i,
      /\.tk$/i, // free domain
      /\.ml$/i,
      /\.ga$/i,
      /(paypa1|paya1|amaz0n|g00gle)/i, // homoglyph attacks
      /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/, // IP address
    ],
    weight: 25,
    severity: 'high' as const,
  },
  legitimate_lookalikes: {
    patterns: [
      /paypa[l1]\..*/i,
      /amaz[o0]n\..*/i,
      /([a-z0-9-]*)?paypal[a-z0-9-]*\./i,
      /([a-z0-9-]*)?amazon[a-z0-9-]*\./i,
    ],
    weight: 35,
    severity: 'critical' as const,
  },
}

export function analyzeText(text: string): ScamAnalysisResult {
  const lowerText = text.toLowerCase()
  const patterns: DetectedPattern[] = []
  let totalScore = 0

  // Check urgency patterns
  for (const keyword of scamPatterns.urgency.keywords) {
    if (lowerText.includes(keyword)) {
      patterns.push({
        name: 'Urgency Language',
        confidence: Math.min(100, (lowerText.match(new RegExp(keyword, 'gi')) || []).length * 15),
        description: `Uses urgent language like "${keyword}"`,
        severity: scamPatterns.urgency.severity,
      })
      totalScore += scamPatterns.urgency.weight
      break
    }
  }

  // Check financial threats
  for (const keyword of scamPatterns.financial_threats.keywords) {
    if (lowerText.includes(keyword)) {
      patterns.push({
        name: 'Financial Threat Claims',
        confidence: Math.min(100, (lowerText.match(new RegExp(keyword, 'gi')) || []).length * 20),
        description: `Mentions financial issues: "${keyword}"`,
        severity: scamPatterns.financial_threats.severity,
      })
      totalScore += scamPatterns.financial_threats.weight
      break
    }
  }

  // Check impersonation
  for (const keyword of scamPatterns.impersonation.keywords) {
    if (lowerText.includes(keyword)) {
      patterns.push({
        name: 'Impersonation Attempt',
        confidence: Math.min(100, (lowerText.match(new RegExp(keyword, 'gi')) || []).length * 18),
        description: `Impersonates institution: "${keyword}"`,
        severity: scamPatterns.impersonation.severity,
      })
      totalScore += scamPatterns.impersonation.weight
      break
    }
  }

  // Check suspicious requests
  for (const keyword of scamPatterns.suspicious_requests.keywords) {
    if (lowerText.includes(keyword)) {
      patterns.push({
        name: 'Suspicious Information Request',
        confidence: Math.min(100, (lowerText.match(new RegExp(keyword, 'gi')) || []).length * 22),
        description: `Requests sensitive info: "${keyword}"`,
        severity: scamPatterns.suspicious_requests.severity,
      })
      totalScore += scamPatterns.suspicious_requests.weight
      break
    }
  }

  // Check generic greetings
  for (const keyword of scamPatterns.generic_greetings.keywords) {
    if (lowerText.includes(keyword)) {
      patterns.push({
        name: 'Generic Greeting',
        confidence: 60,
        description: 'Uses impersonal greeting',
        severity: scamPatterns.generic_greetings.severity,
      })
      totalScore += scamPatterns.generic_greetings.weight
      break
    }
  }

  // Check for poor grammar
  let grammarScore = 0
  for (const pattern of scamPatterns.poor_english.patterns) {
    if (pattern.test(text)) {
      grammarScore += 8
    }
  }
  if (grammarScore > 0) {
    patterns.push({
      name: 'Poor Grammar/Formatting',
      confidence: Math.min(100, grammarScore),
      description: 'Message contains grammar or formatting errors',
      severity: scamPatterns.poor_english.severity,
    })
    totalScore += grammarScore
  }

  // Extract URLs and analyze
  const urlRegex = /(https?:\/\/[^\s]+)/gi
  const urls = text.match(urlRegex) || []
  for (const url of urls) {
    const urlAnalysis = analyzeUrl(url)
    if (urlAnalysis.riskScore > 0) {
      patterns.push(...urlAnalysis.patterns)
      totalScore += urlAnalysis.riskScore / 2 // Weight URLs less
    }
  }

  // Calculate final risk score
  const riskScore = Math.min(100, totalScore)
  
  // Determine risk level
  let riskLevel: ScamAnalysisResult['riskLevel'] = 'safe'
  if (riskScore >= 80) riskLevel = 'critical'
  else if (riskScore >= 60) riskLevel = 'high'
  else if (riskScore >= 40) riskLevel = 'medium'
  else if (riskScore >= 20) riskLevel = 'low'

  // Generate explanation
  const explanation = generateExplanation(riskLevel, patterns)
  const recommendations = generateRecommendations(riskLevel, patterns)

  return {
    riskScore: Math.round(riskScore),
    riskLevel,
    patterns: patterns.slice(0, 5), // Top 5 patterns
    explanation,
    recommendations,
  }
}

export function analyzeUrl(url: string): { riskScore: number; patterns: DetectedPattern[] } {
  const patterns: DetectedPattern[] = []
  let riskScore = 0

  try {
    const urlObj = new URL(url)
    const domain = urlObj.hostname.toLowerCase()
    
    // Check for IDN/Punycode homoglyph attacks
    // Flags domains with non-ASCII characters or the xn-- prefix
    const isIdn = /^xn--/.test(domain) || /[^\x00-\x7F]/.test(domain);
    if (isIdn) {
      patterns.push({
        name: 'Homoglyph/IDN Attack',
        confidence: 95,
        description: `Domain uses non-standard characters to impersonate legitimate services: ${domain}`,
        severity: 'critical',
      })
      riskScore += 40
    }

    // Check for suspicious URL shorteners
    for (const pattern of urlPatterns.suspicious.patterns) {
      if (pattern.test(domain)) {
        patterns.push({
          name: 'Suspicious URL Pattern',
          confidence: 85,
          description: `URL uses shortener or suspicious domain: ${domain}`,
          severity: urlPatterns.suspicious.severity,
        })
        riskScore += urlPatterns.suspicious.weight
        break
      }
    }

    // Check for lookalike domains
    const legitDomains = ['paypal.com', 'amazon.com', 'google.com', 'microsoft.com', 'apple.com']
    const isExactlyLegit = legitDomains.includes(domain)

    if (!isExactlyLegit) {
      for (const pattern of urlPatterns.legitimate_lookalikes.patterns) {
        if (pattern.test(domain)) {
          patterns.push({
            name: 'Lookalike Domain',
            confidence: 95,
            description: `Domain resembles a legitimate service but is unauthorized: ${domain}`,
            severity: urlPatterns.legitimate_lookalikes.severity,
          })
          riskScore += urlPatterns.legitimate_lookalikes.weight
          break
        }
      }
    }

    // Check for suspicious subdomains
    const subdomainCount = domain.split('.').length
    if (subdomainCount > 3) {
      patterns.push({
        name: 'Complex Subdomain',
        confidence: 70,
        description: `URL has many subdomains which may hide true domain: ${domain}`,
        severity: 'medium',
      })
      riskScore += 12
    }
  } catch (e) {
    // Invalid URL
    patterns.push({
      name: 'Invalid URL Format',
      confidence: 75,
      description: 'URL format is invalid or malformed',
      severity: 'medium',
    })
    riskScore += 15
  }

  return { riskScore: Math.min(50, riskScore), patterns }
}

export function analyzeEmail(email: string): ScamAnalysisResult {
  // Email analysis combines text analysis with domain checking
  const parts = email.split('@')
  if (parts.length !== 2) {
    return {
      riskScore: 30, // Suspicious format
      riskLevel: 'low',
      patterns: [{
        name: 'Invalid Email Format',
        confidence: 100,
        description: 'Email address has an invalid structure',
        severity: 'low'
      }],
      explanation: 'This does not appear to be a correctly formatted email address.',
      recommendations: ['Check the email address for typos', 'Do not interact if the source is unknown'],
    }
  }

  const [localPart, domain] = parts
  const textAnalysis = analyzeText(email)

  // Check domain reputation
  const commonLegitDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'protonmail.com', 'icloud.com']
  if (!commonLegitDomains.some(d => domain.toLowerCase().includes(d))) {
    // Bonus check: if using company domain, verify it matches content
    if (!email.toLowerCase().includes('no-reply') && !email.toLowerCase().includes('noreply')) {
      textAnalysis.riskScore = Math.min(100, textAnalysis.riskScore + 10)
    }
  }

  // Recalculate risk level if score changed
  if (textAnalysis.riskScore >= 80) textAnalysis.riskLevel = 'critical'
  else if (textAnalysis.riskScore >= 60) textAnalysis.riskLevel = 'high'
  else if (textAnalysis.riskScore >= 40) textAnalysis.riskLevel = 'medium'
  else if (textAnalysis.riskScore >= 20) textAnalysis.riskLevel = 'low'
  else textAnalysis.riskLevel = 'safe'

  // Update explanation and recommendations based on new risk level
  textAnalysis.explanation = generateExplanation(textAnalysis.riskLevel, textAnalysis.patterns)
  textAnalysis.recommendations = generateRecommendations(textAnalysis.riskLevel, textAnalysis.patterns)

  return textAnalysis
}

function generateExplanation(riskLevel: string, patterns: DetectedPattern[]): string {
  const explanations: Record<string, string> = {
    critical: 'This message shows multiple signs of being a scam. Do NOT click links, download files, or share personal information.',
    high: 'This message has several characteristics typical of scams. Be very cautious.',
    medium: 'This message contains some suspicious elements. Verify independently before responding.',
    low: 'This message has minor suspicious elements. Likely safe, but stay vigilant.',
    safe: 'No scam indicators detected. This message appears legitimate.',
  }

  return explanations[riskLevel] || explanations.safe
}

function generateRecommendations(riskLevel: string, patterns: DetectedPattern[]): string[] {
  const baseRecommendations: Record<string, string[]> = {
    critical: [
      '🚫 Do NOT click any links in this message',
      '🚫 Do NOT download any attachments',
      '🚫 Do NOT share personal or financial information',
      '✅ Report this message to the appropriate platform',
      '✅ Contact the company directly using official contact info',
    ],
    high: [
      '⚠️ Verify this message independently before responding',
      '⚠️ Check sender email address carefully',
      '⚠️ Never click links - type URL directly in browser',
      '✅ Contact the company using official phone number',
    ],
    medium: [
      '⚠️ Be cautious with any requests for personal info',
      '⚠️ Verify sender identity through official channels',
      '✅ If in doubt, ask the company directly',
    ],
    low: [
      '✅ Message appears mostly legitimate',
      '⚠️ Still verify requests for sensitive information',
    ],
    safe: [
      '✅ This message appears safe',
      '✅ Standard security practices still apply',
    ],
  }

  return baseRecommendations[riskLevel] || baseRecommendations.safe
}
