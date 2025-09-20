import { Router } from 'express';
import { ConfigService } from '../services/config';

const router = Router();

// Get all site configuration
router.get('/', async (req, res) => {
  try {
    const configs = await ConfigService.getAll();

    res.json({
      success: true,
      data: configs
    });
  } catch (error) {
    console.error('❌ Config API Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch site configuration'
    });
  }
});

// Get a specific configuration value
router.get('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const value = await ConfigService.get(key);

    if (value === null) {
      return res.status(404).json({ 
        success: false, 
        error: 'Configuration not found' 
      });
    }

    res.json({
      success: true,
      data: {
        key,
        value
      }
    });
  } catch (error) {
    console.error('❌ Config API Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch configuration'
    });
  }
});

// Update a configuration value (admin only)
router.put('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { value, dataType = 'string' } = req.body;

    if (value === undefined || value === null) {
      return res.status(400).json({
        success: false,
        error: 'Value is required'
      });
    }

    const result = await ConfigService.set(key, value, dataType);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('❌ Config API Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update configuration'
    });
  }
});

export default router;
