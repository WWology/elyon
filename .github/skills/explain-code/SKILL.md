---
name: explain-code
description: 'Generate a clear code explanation with examples'
disable-model-invocation: true
---
Explain the following code in a clear, beginner-friendly way:

Code to explain: ${input:code:Paste your code here}

If the code input is empty, still contains the placeholder text, or is not source code, do not produce the explanation. Respond with: "Please provide the code you want explained."

Please provide:

- A brief overview of what the code does
- A step-by-step breakdown of the main parts
- Explanation of any key concepts or terminology
- A simple example showing how it works
- Common use cases or when you might use this approach

Use clear, simple language and avoid unnecessary jargon.
