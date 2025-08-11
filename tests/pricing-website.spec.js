const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs').promises;

// Test configuration
const BASE_URL = 'http://localhost:8080';

test.describe('LLM Pricing Website', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the main page before each test
    await page.goto(`file://${path.resolve(__dirname, '../index.html')}`);
  });

  test('should load the pricing data', async ({ page }) => {
    // Wait for the pricing table to load
    await page.waitForSelector('#pricingTable', { state: 'visible' });
    
    // Check if data is loaded
    const rows = await page.locator('#tableBody tr').count();
    expect(rows).toBeGreaterThan(0);
    
    // Verify the loading message is hidden
    const loadingDisplay = await page.locator('#loading').evaluate(el => 
      window.getComputedStyle(el).display
    );
    expect(loadingDisplay).toBe('none');
  });

  test('should display provider statistics', async ({ page }) => {
    // Wait for stats to load
    await page.waitForSelector('#providerCount');
    
    // Check provider count
    const providerCount = await page.locator('#providerCount').textContent();
    expect(parseInt(providerCount)).toBeGreaterThan(0);
    
    // Check model count
    const modelCount = await page.locator('#modelCount').textContent();
    expect(parseInt(modelCount)).toBeGreaterThan(0);
    
    // Check average prices are displayed
    const avgInputPrice = await page.locator('#avgInputPrice').textContent();
    expect(avgInputPrice).toContain('$');
    
    const avgOutputPrice = await page.locator('#avgOutputPrice').textContent();
    expect(avgOutputPrice).toContain('$');
  });

  test('should filter by search term', async ({ page }) => {
    await page.waitForSelector('#tableBody tr');
    
    // Get initial row count
    const initialRows = await page.locator('#tableBody tr').count();
    
    // Search for OpenAI
    await page.fill('#search', 'OpenAI');
    
    // Wait for filtering to complete
    await page.waitForTimeout(500);
    
    // Check filtered results
    const filteredRows = await page.locator('#tableBody tr').count();
    expect(filteredRows).toBeLessThan(initialRows);
    
    // Verify all visible rows contain OpenAI
    const providerCells = await page.locator('#tableBody tr .provider-name').allTextContents();
    providerCells.forEach(provider => {
      expect(provider).toContain('OpenAI');
    });
  });

  test('should filter by provider dropdown', async ({ page }) => {
    await page.waitForSelector('#tableBody tr');
    
    // Select Anthropic from dropdown
    await page.selectOption('#providerFilter', 'Anthropic');
    
    // Wait for filtering
    await page.waitForTimeout(500);
    
    // Verify all rows are Anthropic models
    const providerCells = await page.locator('#tableBody tr .provider-name').allTextContents();
    providerCells.forEach(provider => {
      expect(provider).toContain('Anthropic');
    });
  });

  test('should filter by category', async ({ page }) => {
    await page.waitForSelector('#tableBody tr');
    
    // Select efficient category
    await page.selectOption('#categoryFilter', 'efficient');
    
    // Wait for filtering
    await page.waitForTimeout(500);
    
    // Check that filtered models have efficient category
    const categoryBadges = await page.locator('#tableBody tr .category-badge').allTextContents();
    categoryBadges.forEach(category => {
      expect(category.toLowerCase()).toBe('efficient');
    });
  });

  test('should sort by different criteria', async ({ page }) => {
    await page.waitForSelector('#tableBody tr');
    
    // Sort by input price
    await page.selectOption('#sortBy', 'inputPrice');
    await page.waitForTimeout(500);
    
    // Get all input prices
    const prices = await page.locator('#tableBody tr .price-input').allTextContents();
    const numericPrices = prices.map(p => parseFloat(p.replace('$', '')));
    
    // Verify ascending order
    for (let i = 1; i < numericPrices.length; i++) {
      expect(numericPrices[i]).toBeGreaterThanOrEqual(numericPrices[i - 1]);
    }
  });

  test('should download JSON file', async ({ page }) => {
    // Start waiting for download before clicking
    const downloadPromise = page.waitForEvent('download');
    
    // Click download button
    await page.click('button:has-text("Download JSON")');
    
    // Wait for download to complete
    const download = await downloadPromise;
    
    // Verify download filename
    expect(download.suggestedFilename()).toBe('llm-pricing.json');
    
    // Save and verify content
    const downloadPath = await download.path();
    const content = await fs.readFile(downloadPath, 'utf-8');
    const data = JSON.parse(content);
    
    expect(data).toHaveProperty('providers');
    expect(data).toHaveProperty('lastUpdated');
    expect(data.providers.length).toBeGreaterThan(0);
  });

  test('should display model features', async ({ page }) => {
    await page.waitForSelector('#tableBody tr');
    
    // Check that feature badges are displayed
    const featureBadges = await page.locator('.feature-badge').first();
    expect(await featureBadges.isVisible()).toBeTruthy();
    
    // Check feature text
    const featureText = await featureBadges.textContent();
    expect(featureText.length).toBeGreaterThan(0);
  });

  test('should show pricing in correct format', async ({ page }) => {
    await page.waitForSelector('#tableBody tr');
    
    // Check input price format
    const inputPrice = await page.locator('.price-input').first().textContent();
    expect(inputPrice).toMatch(/^\$\d+\.\d{4}$/);
    
    // Check output price format
    const outputPrice = await page.locator('.price-output').first().textContent();
    expect(outputPrice).toMatch(/^\$\d+\.\d{4}$/);
  });

  test('should display context window with proper formatting', async ({ page }) => {
    await page.waitForSelector('#tableBody tr');
    
    // Get context window values
    const contextWindows = await page.locator('#tableBody tr td:nth-child(6)').allTextContents();
    
    contextWindows.forEach(window => {
      // Should be formatted with commas
      expect(window).toMatch(/^[\d,]+$/);
      
      // Parse and verify it's a valid number
      const num = parseInt(window.replace(/,/g, ''));
      expect(num).toBeGreaterThan(0);
    });
  });

  test('should combine multiple filters', async ({ page }) => {
    await page.waitForSelector('#tableBody tr');
    
    // Apply multiple filters
    await page.fill('#search', 'GPT');
    await page.selectOption('#categoryFilter', 'flagship');
    await page.waitForTimeout(500);
    
    // Get filtered results
    const models = await page.locator('#tableBody tr .model-name').allTextContents();
    
    // Verify results match both filters
    models.forEach(model => {
      expect(model.toLowerCase()).toContain('gpt');
    });
    
    const categories = await page.locator('#tableBody tr .category-badge').allTextContents();
    categories.forEach(category => {
      expect(category.toLowerCase()).toBe('flagship');
    });
  });

  test('should clear filters correctly', async ({ page }) => {
    await page.waitForSelector('#tableBody tr');
    
    // Get initial count
    const initialCount = await page.locator('#tableBody tr').count();
    
    // Apply filter
    await page.fill('#search', 'Claude');
    await page.waitForTimeout(500);
    const filteredCount = await page.locator('#tableBody tr').count();
    expect(filteredCount).toBeLessThan(initialCount);
    
    // Clear filter
    await page.fill('#search', '');
    await page.waitForTimeout(500);
    
    // Should return to original count
    const clearedCount = await page.locator('#tableBody tr').count();
    expect(clearedCount).toBe(initialCount);
  });
});

test.describe('API Documentation Page', () => {
  test('should load API documentation', async ({ page }) => {
    // Navigate to API page
    await page.goto(`file://${path.resolve(__dirname, '../api.html')}`);
    
    // Check page title
    await expect(page).toHaveTitle('LLM Pricing API Documentation');
    
    // Check main heading
    const heading = await page.locator('h1').textContent();
    expect(heading).toContain('LLM Pricing API Documentation');
  });

  test('should display code examples', async ({ page }) => {
    await page.goto(`file://${path.resolve(__dirname, '../api.html')}`);
    
    // Check for code examples
    const codeBlocks = await page.locator('pre code').count();
    expect(codeBlocks).toBeGreaterThan(0);
    
    // Verify JavaScript example exists
    const jsExample = await page.locator('pre:has-text("fetch")').first();
    expect(await jsExample.isVisible()).toBeTruthy();
    
    // Verify Python example exists
    const pythonExample = await page.locator('pre:has-text("import requests")').first();
    expect(await pythonExample.isVisible()).toBeTruthy();
  });

  test('should have navigation links', async ({ page }) => {
    await page.goto(`file://${path.resolve(__dirname, '../api.html')}`);
    
    // Check for pricing table link
    const pricingLink = await page.locator('a:has-text("View Pricing Table")').first();
    expect(await pricingLink.isVisible()).toBeTruthy();
    
    // Check for download JSON link
    const downloadLink = await page.locator('a:has-text("Download JSON")').first();
    expect(await downloadLink.isVisible()).toBeTruthy();
  });
});

test.describe('Responsive Design', () => {
  test('should work on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto(`file://${path.resolve(__dirname, '../index.html')}`);
    await page.waitForSelector('#pricingTable', { state: 'visible' });
    
    // Check that controls are still accessible
    const searchInput = await page.locator('#search');
    expect(await searchInput.isVisible()).toBeTruthy();
    
    // Check table is scrollable
    const tableContainer = await page.locator('.table-container');
    const overflow = await tableContainer.evaluate(el => 
      window.getComputedStyle(el).overflowX
    );
    expect(overflow).toBe('auto');
  });

  test('should work on tablet viewport', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    
    await page.goto(`file://${path.resolve(__dirname, '../index.html')}`);
    await page.waitForSelector('#pricingTable', { state: 'visible' });
    
    // Verify layout adjustments
    const controls = await page.locator('.controls');
    expect(await controls.isVisible()).toBeTruthy();
    
    // Check stats grid is visible
    const stats = await page.locator('.stats');
    expect(await stats.isVisible()).toBeTruthy();
  });
});

test.describe('Data Validation', () => {
  test('should have valid JSON structure', async ({ page }) => {
    // Read the JSON file directly
    const jsonPath = path.resolve(__dirname, '../data/llm-pricing.json');
    const content = await fs.readFile(jsonPath, 'utf-8');
    const data = JSON.parse(content);
    
    // Validate structure
    expect(data).toHaveProperty('lastUpdated');
    expect(data).toHaveProperty('providers');
    expect(Array.isArray(data.providers)).toBeTruthy();
    
    // Validate each provider
    data.providers.forEach(provider => {
      expect(provider).toHaveProperty('name');
      expect(provider).toHaveProperty('website');
      expect(provider).toHaveProperty('models');
      expect(Array.isArray(provider.models)).toBeTruthy();
      
      // Validate each model
      provider.models.forEach(model => {
        expect(model).toHaveProperty('name');
        expect(model).toHaveProperty('modelId');
        expect(model).toHaveProperty('contextWindow');
        expect(model).toHaveProperty('pricing');
        expect(model.pricing).toHaveProperty('input');
        expect(model.pricing).toHaveProperty('output');
        expect(typeof model.pricing.input).toBe('number');
        expect(typeof model.pricing.output).toBe('number');
      });
    });
  });

  test('should have reasonable price ranges', async ({ page }) => {
    const jsonPath = path.resolve(__dirname, '../data/llm-pricing.json');
    const content = await fs.readFile(jsonPath, 'utf-8');
    const data = JSON.parse(content);
    
    data.providers.forEach(provider => {
      provider.models.forEach(model => {
        // Input prices should be reasonable (0-1000 per 1M tokens)
        expect(model.pricing.input).toBeGreaterThanOrEqual(0);
        expect(model.pricing.input).toBeLessThan(1000);
        
        // Output prices should be reasonable
        expect(model.pricing.output).toBeGreaterThanOrEqual(0);
        expect(model.pricing.output).toBeLessThan(1000);
        
        // Output is typically more expensive than input
        if (model.pricing.input > 0) {
          expect(model.pricing.output).toBeGreaterThanOrEqual(model.pricing.input * 0.5);
        }
      });
    });
  });
});