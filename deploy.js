#!/usr/bin/env node

/**
 * Deployment and setup script for AI Interview Coach
 * Automates the deployment process and validates configuration
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class DeploymentManager {
  constructor() {
    this.projectRoot = process.cwd();
    this.configPath = path.join(this.projectRoot, 'wrangler.toml');
  }

  log(message, type = 'info') {
    const colors = {
      info: '\x1b[36m',
      success: '\x1b[32m',
      warning: '\x1b[33m',
      error: '\x1b[31m',
      reset: '\x1b[0m'
    };
    
    console.log(`${colors[type]}[${type.toUpperCase()}]${colors.reset} ${message}`);
  }

  async run() {
    try {
      this.log('🚀 Starting AI Interview Coach deployment process...');
      
      await this.validateEnvironment();
      await this.setupKVNamespaces();
      await this.updateConfiguration();
      await this.runTests();
      await this.deploy();
      
      this.log('✅ Deployment completed successfully!', 'success');
      this.displayPostDeploymentInfo();
    } catch (error) {
      this.log(`❌ Deployment failed: ${error.message}`, 'error');
      process.exit(1);
    }
  }

  async validateEnvironment() {
    this.log('🔍 Validating environment...');
    
    // Check if wrangler is installed
    try {
      execSync('npx wrangler --version', { stdio: 'pipe' });
      this.log('✓ Wrangler CLI found');
    } catch (error) {
      throw new Error('Wrangler CLI not found. Please install it: npm install -g wrangler');
    }

    // Check if user is logged in
    try {
      execSync('npx wrangler whoami', { stdio: 'pipe' });
      this.log('✓ Cloudflare authentication verified');
    } catch (error) {
      throw new Error('Not authenticated with Cloudflare. Please run: npx wrangler login');
    }

    // Check if Workers AI is available
    this.log('✓ Environment validation completed');
  }

  async setupKVNamespaces() {
    this.log('📦 Setting up KV namespaces...');
    
    try {
      // Create production KV namespace
      const prodResult = execSync('npx wrangler kv:namespace create "INTERVIEW_KV"', { encoding: 'utf8' });
      const prodMatch = prodResult.match(/id = "([^"]+)"/);
      
      if (!prodMatch) {
        throw new Error('Failed to extract production KV namespace ID');
      }
      
      const prodId = prodMatch[1];
      this.log(`✓ Production KV namespace created: ${prodId}`);

      // Create preview KV namespace
      const previewResult = execSync('npx wrangler kv:namespace create "INTERVIEW_KV" --preview', { encoding: 'utf8' });
      const previewMatch = previewResult.match(/preview_id = "([^"]+)"/);
      
      if (!previewMatch) {
        throw new Error('Failed to extract preview KV namespace ID');
      }
      
      const previewId = previewMatch[1];
      this.log(`✓ Preview KV namespace created: ${previewId}`);

      // Update wrangler.toml with actual IDs
      await this.updateWranglerConfig(prodId, previewId);
      
    } catch (error) {
      if (error.message.includes('already exists')) {
        this.log('⚠️  KV namespaces already exist, skipping creation', 'warning');
      } else {
        throw error;
      }
    }
  }

  async updateWranglerConfig(prodId, previewId) {
    let config = fs.readFileSync(this.configPath, 'utf8');
    
    // Replace placeholder IDs with actual IDs
    config = config.replace(/id = "your-kv-namespace-id"/, `id = "${prodId}"`);
    config = config.replace(/preview_id = "your-preview-kv-namespace-id"/, `preview_id = "${previewId}"`);
    
    fs.writeFileSync(this.configPath, config);
    this.log('✓ Updated wrangler.toml with KV namespace IDs');
  }

  async updateConfiguration() {
    this.log('⚙️  Updating configuration...');
    
    // Ensure compatibility date is current
    let config = fs.readFileSync(this.configPath, 'utf8');
    const today = new Date().toISOString().split('T')[0];
    config = config.replace(/compatibility_date = "[^"]*"/, `compatibility_date = "${today}"`);
    
    fs.writeFileSync(this.configPath, config);
    this.log('✓ Configuration updated');
  }

  async runTests() {
    this.log('🧪 Running pre-deployment tests...');
    
    // Basic syntax check
    try {
      execSync('node -c functions/index.js', { stdio: 'pipe' });
      execSync('node -c functions/durableObject.js', { stdio: 'pipe' });
      this.log('✓ JavaScript syntax validation passed');
    } catch (error) {
      throw new Error('JavaScript syntax validation failed');
    }

    // Check if required files exist
    const requiredFiles = [
      'functions/index.js',
      'functions/durableObject.js',
      'public/index.html',
      'public/chat.js',
      'public/style.css',
      'wrangler.toml',
      'package.json'
    ];

    for (const file of requiredFiles) {
      if (!fs.existsSync(path.join(this.projectRoot, file))) {
        throw new Error(`Required file missing: ${file}`);
      }
    }
    
    this.log('✓ File structure validation passed');
  }

  async deploy() {
    this.log('🚀 Deploying to Cloudflare...');
    
    try {
      // Deploy the Worker
      execSync('npx wrangler deploy', { stdio: 'inherit' });
      this.log('✓ Worker deployed successfully', 'success');
      
      // Deploy static assets (if using separate Pages deployment)
      // Uncomment if you want to deploy to Pages separately
      // execSync('npx wrangler pages deploy public', { stdio: 'inherit' });
      // this.log('✓ Static assets deployed to Pages', 'success');
      
    } catch (error) {
      throw new Error(`Deployment failed: ${error.message}`);
    }
  }

  displayPostDeploymentInfo() {
    this.log('\n🎉 Deployment Information:', 'success');
    this.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    this.log('');
    this.log('📝 Next Steps:');
    this.log('1. Visit your Worker URL to test the application');
    this.log('2. Verify AI model responses are working correctly');
    this.log('3. Test voice recognition functionality');
    this.log('4. Monitor usage and costs in Cloudflare dashboard');
    this.log('');
    this.log('🔧 Useful Commands:');
    this.log('- View logs: npx wrangler tail');
    this.log('- Update deployment: npm run deploy');
    this.log('- Local development: npm run dev');
    this.log('');
    this.log('📊 Monitoring:');
    this.log('- Check AI usage: Cloudflare Dashboard > Workers AI');
    this.log('- Monitor Durable Objects: Cloudflare Dashboard > Durable Objects');
    this.log('- View KV data: npx wrangler kv:key list --binding INTERVIEW_KV');
    this.log('');
    this.log('🆘 Need Help?');
    this.log('- Documentation: README.md');
    this.log('- Health check: https://your-worker.your-subdomain.workers.dev/api/health');
    this.log('');
  }
}

// Run deployment if called directly
if (require.main === module) {
  const manager = new DeploymentManager();
  manager.run();
}

module.exports = DeploymentManager;