import { getOverviewSummary } from "./service.js";

export async function overviewController(req, res) {
  try {
    // Call the service to get counts, status breakdown, and recent lists
    const data = await getOverviewSummary();
    
    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    console.error("❌ Overview Summary Error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Failed to load overview data" 
    });
  }
}