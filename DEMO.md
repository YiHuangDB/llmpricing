# LLM Pricing Comparison Website - Complete Demo

## 🚀 Project Overview

This project provides a comprehensive LLM pricing comparison website with:
- **Static JSON API** for programmatic access
- **Interactive web interface** with filtering and sorting
- **Automated price updates** using Playwright web scraping
- **GitHub Pages deployment** ready

## 📁 Project Structure

```
llmpricing/
├── index.html                 # Main pricing comparison interface
├── api.html                   # API documentation page
├── data/
│   └── llm-pricing.json      # Static JSON pricing data
├── scripts/
│   └── update-pricing.js     # Playwright scraper for live updates
├── tests/
│   ├── pricing-website.spec.js    # Playwright tests for the website
│   └── live-scraping.spec.js      # Tests for price scraping
├── .github/
│   └── workflows/
│       └── update-pricing.yml     # GitHub Actions for daily updates
├── package.json               # Node.js dependencies
├── playwright.config.js      # Playwright test configuration
└── server.js                 # Local development server
```

## 🌟 Features

### 1. Static JSON API
- **Endpoint**: `/data/llm-pricing.json`
- **30+ models** from 7+ providers
- **Structured data** with pricing, features, context windows
- **No rate limits** - static file serving

### 2. Web Interface
- **Real-time filtering** by provider, category, search term
- **Sorting** by price, context window, provider
- **Responsive design** for mobile and desktop
- **Statistics dashboard** showing averages and counts
- **Download JSON** functionality

### 3. Automated Price Updates
- **Playwright web scraping** from official pricing pages
- **GitHub Actions** runs daily at 2 AM UTC
- **Automatic commits** of updated prices
- **Error handling** and reporting

### 4. Supported Providers
- OpenAI (GPT-4o, GPT-3.5, o1 models)
- Anthropic (Claude 3.5, Claude 3 family)
- Google AI (Gemini 1.5, Gemini 2.0)
- Meta Llama (via AWS Bedrock)
- Mistral AI
- Cohere
- Amazon Bedrock (Nova models)

## 💻 Local Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Local Server
```bash
# Using npm script
npm run serve

# Or using the custom server
node server.js
```

### 3. Access the Website
- Web Interface: http://localhost:8080
- JSON API: http://localhost:8080/data/llm-pricing.json
- API Docs: http://localhost:8080/api.html

## 🧪 Testing

### Run Playwright Tests
```bash
# Run all tests
npx playwright test

# Run specific test file
npx playwright test tests/pricing-website.spec.js

# Run with UI
npx playwright test --ui

# Run in headed mode (see browser)
npx playwright test --headed
```

### Update Prices Manually
```bash
# Run the price scraper
node scripts/update-pricing.js

# Or use npm script
npm run update-prices
```

## 📊 API Usage Examples

### JavaScript
```javascript
// Fetch pricing data
fetch('http://localhost:8080/data/llm-pricing.json')
  .then(res => res.json())
  .then(data => {
    // Find cheapest model
    const allModels = data.providers.flatMap(p => 
      p.models.map(m => ({...m, provider: p.name}))
    );
    
    const cheapest = allModels.sort((a, b) => 
      a.pricing.input - b.pricing.input
    )[0];
    
    console.log('Cheapest model:', cheapest);
  });
```

### Python
```python
import requests

# Fetch pricing data
response = requests.get('http://localhost:8080/data/llm-pricing.json')
data = response.json()

# Find models with vision capabilities
vision_models = []
for provider in data['providers']:
    for model in provider['models']:
        if 'Vision' in model.get('features', []):
            vision_models.append({
                'provider': provider['name'],
                'model': model['name'],
                'price': model['pricing']['input']
            })

print(f"Found {len(vision_models)} vision models")
```

### cURL
```bash
# Get all pricing data
curl http://localhost:8080/data/llm-pricing.json

# Get specific provider (using jq)
curl http://localhost:8080/data/llm-pricing.json | \
  jq '.providers[] | select(.name == "OpenAI")'
```

## 🚀 Deployment to GitHub Pages

1. **Push to GitHub**:
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/llmpricing.git
git push -u origin main
```

2. **Enable GitHub Pages**:
- Go to Settings → Pages
- Source: Deploy from a branch
- Branch: main
- Folder: / (root)
- Save

3. **Set up GitHub Secrets** (optional for enhanced scraping):
- Go to Settings → Secrets → Actions
- Add `OPENAI_API_KEY` (if available)
- Add `COHERE_API_KEY` (if available)

4. **Access Your Site**:
- URL: `https://YOUR_USERNAME.github.io/llmpricing/`
- API: `https://YOUR_USERNAME.github.io/llmpricing/data/llm-pricing.json`

## 🔄 Automated Updates

The GitHub Actions workflow (`update-pricing.yml`) will:
1. Run daily at 2 AM UTC
2. Use Playwright to scrape pricing pages
3. Update the JSON file
4. Commit changes automatically
5. Deploy to GitHub Pages

To manually trigger an update:
1. Go to Actions tab
2. Select "Update LLM Pricing Data"
3. Click "Run workflow"

## 🎯 Use Cases

1. **Price Comparison**: Compare costs across providers
2. **Model Selection**: Find models by features (vision, context length)
3. **Budget Planning**: Calculate costs for specific token usage
4. **API Integration**: Programmatically access pricing in your apps
5. **Market Analysis**: Track pricing trends over time

## 🛠️ Playwright Browser Automation

The project uses Playwright for:
- Web scraping pricing data
- Testing the web interface
- Automating updates

Key capabilities demonstrated:
- Navigate to pricing pages
- Extract structured data
- Handle dynamic content
- Take screenshots
- Run in headless mode

## 📈 Statistics at a Glance

Current coverage (as of last update):
- **7 Providers**
- **30+ Models**
- **Average Input Price**: ~$2.50/1M tokens
- **Average Output Price**: ~$10/1M tokens
- **Max Context Window**: 2M tokens (Gemini 1.5 Pro)

## 🔧 Troubleshooting

### Port Already in Use
```bash
# Kill process on port 8080
npx kill-port 8080

# Or use a different port
npx http-server -p 3000
```

### Playwright Installation
```bash
# Install browsers
npx playwright install chromium
```

### Update Failures
- Check network connectivity
- Verify website structures haven't changed
- Review error logs in GitHub Actions

## 📝 License

MIT License - Feel free to use this for any purpose!

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Add tests if applicable
4. Submit a pull request

## 📞 Support

- Create an issue on GitHub
- Check the API documentation at `/api.html`
- Review test files for usage examples

---

**Live Demo**: Deploy to GitHub Pages for a live version!
**API Endpoint**: Access JSON data programmatically for your applications!