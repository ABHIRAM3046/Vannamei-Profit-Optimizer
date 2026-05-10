"""
Risk/disease detection engine.
Analyzes recent daily logs for patterns that indicate problems.
"""
from datetime import date
from typing import List, Optional, Dict


def analyze_risks(
    pond_id: str,
    logs: List[dict],  # Recent daily logs as dicts
    pl_stocked: int,
) -> List[dict]:
    """
    Analyze the most recent daily logs for risk patterns.

    Args:
        pond_id: ID of the pond
        logs: List of daily log dicts (most recent last), at least 3 recommended
        pl_stocked: Initial stocking count

    Returns:
        List of alert dicts with severity, category, title, message
    """
    alerts = []

    if len(logs) < 2:
        return alerts

    latest = logs[-1]
    previous = logs[-2]

    # ─── 1. Water Quality Alerts ───

    # Low Dissolved Oxygen
    if latest.get("dissolved_oxygen") is not None:
        do = latest["dissolved_oxygen"]
        if do < 3.0:
            alerts.append({
                "severity": "critical",
                "category": "water",
                "title": "Critical: Oxygen Crash",
                "message": f"DO is at {do:.1f} mg/L — shrimp will stop feeding and may die. "
                           f"Activate ALL aerators immediately. Consider emergency partial harvest."
            })
        elif do < 4.0:
            alerts.append({
                "severity": "warning",
                "category": "water",
                "title": "Low Dissolved Oxygen",
                "message": f"DO is {do:.1f} mg/L (safe: >5.0). Increase aeration, reduce feed, "
                           f"and monitor closely — especially at night."
            })

    # High Ammonia
    if latest.get("ammonia") is not None:
        nh3 = latest["ammonia"]
        if nh3 > 0.5:
            alerts.append({
                "severity": "critical",
                "category": "water",
                "title": "Critical: Ammonia Toxicity",
                "message": f"Ammonia at {nh3:.2f} mg/L (safe: <0.1). Reduce feed by 50%, "
                           f"perform water exchange, and apply probiotics."
            })
        elif nh3 > 0.1:
            alerts.append({
                "severity": "warning",
                "category": "water",
                "title": "Elevated Ammonia",
                "message": f"Ammonia at {nh3:.2f} mg/L — stress levels rising. Reduce feed by 20%, "
                           f"apply biofloc/probiotic."
            })

    # pH Instability
    if latest.get("ph") is not None and previous.get("ph") is not None:
        ph_change = abs(latest["ph"] - previous["ph"])
        if ph_change > 0.5:
            alerts.append({
                "severity": "warning",
                "category": "water",
                "title": "pH Instability",
                "message": f"pH changed by {ph_change:.1f} in 24 hours (safe: <0.5). "
                           f"Apply dolomite to stabilize alkalinity. Current pH: {latest['ph']:.1f}"
            })
        if latest["ph"] < 7.0 or latest["ph"] > 9.0:
            alerts.append({
                "severity": "critical",
                "category": "water",
                "title": "pH Out of Safe Range",
                "message": f"pH is {latest['ph']:.1f} (safe: 7.5-8.5). This causes severe stress. "
                           f"Correct immediately with lime/dolomite."
            })

    # ─── 2. Feed / FCR Alerts ───

    # Rising FCR trend (compare last 3+ logs)
    if len(logs) >= 3:
        recent_fcrs = [l.get("fcr") for l in logs[-3:] if l.get("fcr") is not None]
        if len(recent_fcrs) >= 2:
            fcr_change = recent_fcrs[-1] - recent_fcrs[0]
            if fcr_change > 0.3:
                alerts.append({
                    "severity": "warning",
                    "category": "feed",
                    "title": "FCR Trending Up",
                    "message": f"FCR increased by {fcr_change:.2f} over the last {len(recent_fcrs)} entries "
                               f"(current: {recent_fcrs[-1]:.2f}). Review feeding amounts — possible overfeeding "
                               f"or gut health issue."
                })

    # Feed consumption drop
    if len(logs) >= 3:
        recent_feeds = [l.get("feed_given_kg", 0) for l in logs[-3:]]
        if recent_feeds[0] > 0:
            feed_change = (recent_feeds[-1] - recent_feeds[0]) / recent_feeds[0]
            if feed_change < -0.20:
                alerts.append({
                    "severity": "warning",
                    "category": "disease",
                    "title": "Reduced Feed Consumption",
                    "message": f"Feed usage dropped by {abs(feed_change)*100:.0f}% over 3 days. "
                               f"This could indicate disease, poor water quality, or stress. "
                               f"Check feed trays and sample shrimp."
                })

    # ─── 3. Mortality Alerts ───

    if len(logs) >= 7:
        recent_mortalities = [l.get("mortality_count", 0) for l in logs[-7:]]
        avg_mortality = sum(recent_mortalities[:5]) / max(len(recent_mortalities[:5]), 1)
        latest_mortality = latest.get("mortality_count", 0)

        if avg_mortality > 0 and latest_mortality > avg_mortality * 3:
            alerts.append({
                "severity": "critical",
                "category": "disease",
                "title": "Mortality Spike Detected",
                "message": f"Today's mortality ({latest_mortality}) is {latest_mortality/avg_mortality:.1f}× "
                           f"the 7-day average ({avg_mortality:.0f}). Investigate immediately: "
                           f"check for disease, water quality, and predators."
            })
        elif avg_mortality > 0 and latest_mortality > avg_mortality * 2:
            alerts.append({
                "severity": "warning",
                "category": "disease",
                "title": "Elevated Mortality",
                "message": f"Today's mortality ({latest_mortality}) is above normal. "
                           f"Monitor closely for disease signs."
            })
    elif latest.get("mortality_count", 0) > 0:
        total_dead = sum(l.get("mortality_count", 0) for l in logs)
        survival = ((pl_stocked - total_dead) / pl_stocked) * 100
        if survival < 70:
            alerts.append({
                "severity": "critical",
                "category": "disease",
                "title": "Low Survival Rate",
                "message": f"Survival rate is {survival:.0f}%. Major losses detected. "
                           f"Consider partial harvest to minimize further losses."
            })

    # ─── 4. Growth Alerts ───

    if latest.get("adg") is not None and latest.get("doc", 0) > 30:
        if latest["adg"] < 0.15:
            alerts.append({
                "severity": "warning",
                "category": "growth",
                "title": "Slow Growth Rate",
                "message": f"ADG is {latest['adg']:.3f} g/day (target: >0.2). Growth is slower than expected. "
                           f"Check feed quality, water parameters, and stocking density."
            })

    # ─── 5. Harvest Timing Alert ───

    if latest.get("fcr") is not None and latest.get("doc", 0) > 80:
        if latest["fcr"] > 1.8:
            alerts.append({
                "severity": "info",
                "category": "harvest",
                "title": "Consider Harvesting Soon",
                "message": f"FCR is {latest['fcr']:.2f} and DOC is {latest['doc']}. "
                           f"Feed costs are outpacing growth. Run the harvest planner to optimize timing."
            })

    return alerts
