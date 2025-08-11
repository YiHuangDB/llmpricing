# LLM Pricing Comparison

A static website for comparing LLM pricing across major providers, with automated price updates via web scraping.

## Features

- **Static JSON API**: Access pricing data programmatically at `/data/llm-pricing.json`
- **Interactive Web Interface**: Compare and filter LLM pricing across providers
- **Automated Updates**: Daily price updates via GitHub Actions and Playwright
- **Comprehensive Coverage**: OpenAI, Anthropic, Google AI, Meta, Mistral, Cohere, and more
- **Real-time Filtering**: Search and filter by provider, category, and pricing
- **Downloadable Data**: Export pricing data as JSON for your applications

## Live Demo

Visit: https://[your-username].github.io/llmpricing/

## API Usage

Access the pricing data directly:

```javascript
fetch('https://[your-username].github.io/llmpricing/data/llm-pricing.json')
  .then(res => res.json())
  .then(data => {
    console.log(data.providers);
  });
```

## Data Structure

```json
{
  "lastUpdated": "2025-01-11T00:00:00Z",
  "providers": [
    {
      "name": "OpenAI",
      "website": "https://openai.com/pricing",
      "models": [
        {
          "name": "GPT-4o",
          "modelId": "gpt-4o",
          "contextWindow": 128000,
          "pricing": {
            "input": 2.5,
            "output": 10,
            "unit": "per 1M tokens"
          },
          "features": ["Vision", "Function Calling"],
          "category": "flagship"
        }
      ]
    }
  ]
}
```

## Local Development

1. Clone the repository:
```bash
git clone https://github.com/[your-username]/llmpricing.git
cd llmpricing
```

2. Install dependencies:
```bash
npm install
```

3. Serve locally:
```bash
npm run serve
```

4. Update pricing data:
```bash
npm run update-prices
```

## Automated Updates

The pricing data is automatically updated daily via GitHub Actions. The workflow:
1. Runs Playwright to scrape provider websites
2. Updates the `data/llm-pricing.json` file
3. Commits changes back to the repository
4. GitHub Pages automatically deploys the updates

## Manual Price Updates

To manually trigger a price update:
1. Go to Actions tab in your GitHub repository
2. Select "Update LLM Pricing Data" workflow
3. Click "Run workflow"

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT