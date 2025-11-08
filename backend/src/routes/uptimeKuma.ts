import { Router } from 'express';
import { UptimeKumaService } from '../services/uptimeKumaService';
import { ConfigService } from '../services/config';
import { requireSession, requireAdmin } from '../middleware/auth';

const router = Router();

function initializeUptimeKuma() {
  try {
    const baseUrl = process.env.UPTIME_KUMA_URL;
    const apiKey = process.env.UPTIME_KUMA_API_KEY;
    
    if (baseUrl) {
      UptimeKumaService.initialize(baseUrl, apiKey || undefined);
      console.log('✅ Uptime Kuma service initialized');
    } else {
      console.warn('⚠️  UPTIME_KUMA_URL environment variable not set.');
    }
  } catch (error) {
    console.error('Error initializing Uptime Kuma service:', error);
  }
}

initializeUptimeKuma();

// Get all available monitors (admin only)
router.get('/monitors', requireSession, requireAdmin, async (req, res) => {
  try {
    const baseUrl = process.env.UPTIME_KUMA_URL;
    
    if (!baseUrl) {
      return res.status(400).json({
        success: false,
        error: 'Uptime Kuma not configured',
        message: 'UPTIME_KUMA_URL environment variable is not set. Please set it in your environment configuration.'
      });
    }

    const apiKey = process.env.UPTIME_KUMA_API_KEY;
    UptimeKumaService.initialize(baseUrl, apiKey || undefined);

    const monitors = await UptimeKumaService.getAllMonitors();
    
    res.json({
      success: true,
      data: monitors
    });
  } catch (error: any) {
    console.error('Error fetching monitors:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch monitors',
      message: error.message || 'Unknown error'
    });
  }
});

// Get status for selected monitors (public endpoint)
router.get('/status', async (req, res) => {
  try {
    const baseUrl = process.env.UPTIME_KUMA_URL;
    
    if (!baseUrl) {
      return res.json({
        success: true,
        data: []
      });
    }

    const apiKey = process.env.UPTIME_KUMA_API_KEY;
    UptimeKumaService.initialize(baseUrl, apiKey || undefined);

    let selectedMonitorIds = await ConfigService.get('uptime_kuma_selected_monitors');
    
    if (selectedMonitorIds === null || selectedMonitorIds === undefined) {
      selectedMonitorIds = [];
    }
    
    if (!Array.isArray(selectedMonitorIds) || selectedMonitorIds.length === 0) {
      return res.json({
        success: true,
        data: []
      });
    }

    const monitors = await UptimeKumaService.getMonitorStatus(selectedMonitorIds);
    
    res.json({
      success: true,
      data: monitors
    });
  } catch (error: any) {
    console.error('Error fetching monitor status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch monitor status',
      message: error.message || 'Unknown error'
    });
  }
});

// Get selected monitor IDs (admin only)
router.get('/selected', requireSession, requireAdmin, async (req, res) => {
  try {
    let selectedMonitorIds = await ConfigService.get('uptime_kuma_selected_monitors');
    
    if (selectedMonitorIds === null || selectedMonitorIds === undefined) {
      selectedMonitorIds = [];
    }
    
    if (!Array.isArray(selectedMonitorIds)) {
      selectedMonitorIds = [];
    }
    
    res.json({
      success: true,
      data: selectedMonitorIds
    });
  } catch (error: any) {
    console.error('Error fetching selected monitors:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch selected monitors'
    });
  }
});

// Update selected monitor IDs (admin only)
router.put('/selected', requireSession, requireAdmin, async (req, res) => {
  try {
    const { monitorIds, customNames } = req.body;

    if (!Array.isArray(monitorIds)) {
      return res.status(400).json({
        success: false,
        error: 'monitorIds must be an array'
      });
    }

    const baseUrl = process.env.UPTIME_KUMA_URL;
    const apiKey = process.env.UPTIME_KUMA_API_KEY;
    if (baseUrl) {
      UptimeKumaService.initialize(baseUrl, apiKey || undefined);
    }

    const validIds = monitorIds.filter(id => typeof id === 'number' && id > 0);
    
    await ConfigService.set('uptime_kuma_selected_monitors', validIds, 'json');

    if (baseUrl && validIds.length > 0) {
      try {
        const monitors = await UptimeKumaService.getMonitorStatus(validIds);
        
        if (customNames && typeof customNames === 'object') {
          for (const monitor of monitors) {
            if (customNames[monitor.id] !== undefined) {
              monitor.customName = customNames[monitor.id] || undefined;
            }
          }
        }
        
        await UptimeKumaService.saveMonitorsToCache(monitors);
        console.log(`[Uptime Kuma] Updated cache with ${monitors.length} selected monitors`);
      } catch (error: any) {
        console.error('[Uptime Kuma] Error updating cache with selected monitors:', error.message);
      }
    } else if (validIds.length === 0) {
      try {
        await UptimeKumaService.clearCache();
        console.log('[Uptime Kuma] Cleared cache (no monitors selected)');
      } catch (error: any) {
        console.error('[Uptime Kuma] Error clearing cache:', error.message);
      }
    }

    res.json({
      success: true,
      data: validIds,
      message: 'Selected monitors updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating selected monitors:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update selected monitors',
      message: error.message || 'Unknown error'
    });
  }
});

// Update custom names for monitors (admin only)
router.put('/custom-names', requireSession, requireAdmin, async (req, res) => {
  try {
    const { customNames } = req.body;

    if (!customNames || typeof customNames !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'customNames must be an object mapping monitor IDs to custom names'
      });
    }

    const baseUrl = process.env.UPTIME_KUMA_URL;
    const apiKey = process.env.UPTIME_KUMA_API_KEY;
    if (baseUrl) {
      UptimeKumaService.initialize(baseUrl, apiKey || undefined);
    }

    await UptimeKumaService.updateCustomNames(customNames);

    res.json({
      success: true,
      message: 'Custom names updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating custom names:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update custom names',
      message: error.message || 'Unknown error'
    });
  }
});

// Update Uptime Kuma configuration (admin only)
router.put('/config', requireSession, requireAdmin, async (req, res) => {
  try {
    res.status(400).json({
      success: false,
      error: 'Configuration is read-only',
      message: 'Uptime Kuma URL and API key must be set via environment variables (UPTIME_KUMA_URL and UPTIME_KUMA_API_KEY). Please update your environment configuration and restart the server.'
    });
  } catch (error: any) {
    console.error('Error updating Uptime Kuma config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update configuration',
      message: error.message || 'Unknown error'
    });
  }
});

// Get Uptime Kuma configuration (admin only)
router.get('/config', requireSession, requireAdmin, async (req, res) => {
  try {
    const baseUrl = process.env.UPTIME_KUMA_URL || '';
    const apiKey = process.env.UPTIME_KUMA_API_KEY || '';

    res.json({
      success: true,
      data: {
        baseUrl,
        apiKey: apiKey ? '***' : '',
        isConfigured: !!baseUrl
      }
    });
  } catch (error: any) {
    console.error('Error fetching Uptime Kuma config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch configuration'
    });
  }
});

export default router;

