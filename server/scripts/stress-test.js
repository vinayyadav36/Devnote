#!/usr/bin/env node
/**
 * SALTEDHASH Concurrent Load Test
 * Simulates 200 concurrent users writing snippets
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3000/api/v1';
const CONCURRENT_USERS = 200;
const REQUESTS_PER_USER = 5;

const languages = ['javascript', 'python', 'java', 'go', 'rust'];
const codeTemplates = {
  javascript: `const saltedhash = { build: true };
console.log('SALTEDHASH loaded');
function processSnippet(code) {
  return code.trim();
}`,
  python: `def saltedhash_snippet(data):
    """Process SALTEDHASH data"""
    return data.strip()

print('SALTEDHASH Python Module')`,
  java: `public class SaltedhashSnippet {
  public static void main(String[] args) {
    System.out.println("SALTEDHASH Java");
  }
}`,
  go: `package main
import "fmt"
func main() {
  fmt.Println("SALTEDHASH Go")
}`,
  rust: `fn main() {
  println!("SALTEDHASH Rust");
}`
};

let successCount = 0;
let failureCount = 0;
let totalTime = 0;

async function createSnippet(userId, snippetNum) {
  const language = languages[Math.floor(Math.random() * languages.length)];

  try {
    const startTime = Date.now();

    const response = await fetch(`${API_BASE}/snippets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        snippetId: `stress_test_${userId}_${snippetNum}_${Date.now()}`,
        userId: `test_user_${userId}`,
        code: codeTemplates[language],
        language,
        title: `Stress Test Snippet ${snippetNum}`,
        tags: ['load-test', 'concurrent']
      })
    });

    const elapsed = Date.now() - startTime;
    totalTime += elapsed;

    if (response.ok) {
      successCount++;
      process.stdout.write('.');
    } else {
      failureCount++;
      process.stdout.write('✗');
    }
  } catch (error) {
    failureCount++;
    process.stdout.write('E');
  }
}

async function simulateUser(userId) {
  const promises = [];
  for (let i = 0; i < REQUESTS_PER_USER; i++) {
    promises.push(createSnippet(userId, i));
  }
  await Promise.all(promises);
}

async function runLoadTest() {
  console.log(`\n⚡ SALTEDHASH Concurrent Load Test`);
  console.log(`📊 Configuration: ${CONCURRENT_USERS} users × ${REQUESTS_PER_USER} requests = ${CONCURRENT_USERS * REQUESTS_PER_USER} total requests\n`);

  const startTime = Date.now();
  const userPromises = [];

  for (let i = 0; i < CONCURRENT_USERS; i++) {
    userPromises.push(simulateUser(i));
  }

  await Promise.all(userPromises);
  const totalElapsed = Date.now() - startTime;

  console.log(`\n\n✅ Load Test Complete\n`);
  console.log(`📈 Results:`);
  console.log(`  Success: ${successCount} requests`);
  console.log(`  Failures: ${failureCount} requests`);
  console.log(`  Success Rate: ${((successCount / (successCount + failureCount)) * 100).toFixed(2)}%`);
  console.log(`  Total Time: ${(totalElapsed / 1000).toFixed(2)}s`);
  console.log(`  Avg Request Time: ${((totalElapsed / (successCount + failureCount)) * 1000).toFixed(2)}ms`);
  console.log(`  Throughput: ${(CONCURRENT_USERS * REQUESTS_PER_USER / (totalElapsed / 1000)).toFixed(2)} req/s\n`);
}

runLoadTest().catch(console.error);
