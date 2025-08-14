#!/usr/bin/env node

// Test script for Groq analyzer
import { testGroqAnalyzer } from './build/multirepo/groq-analyzer.js';

console.log('🧪 Testing Groq Analyzer with existing multirepo-index.json...\n');

// Test with existing index
await testGroqAnalyzer('multirepo-index.json');
