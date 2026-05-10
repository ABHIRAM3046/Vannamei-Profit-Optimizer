"""
Feed recommendation engine.
Calculates optimal daily feed based on biomass, DOC, FCR, and water quality.
"""
from typing import List, Optional, Tuple


# Feeding rate as % of biomass, indexed by DOC range
FEED_RATE_TABLE = [
    (0, 30, 0.08),    # 8% of biomass for DOC 1-30
    (31, 60, 0.06),   # 6% for DOC 31-60
    (61, 90, 0.04),   # 4% for DOC 61-90
    (91, 120, 0.03),  # 3% for DOC 91-120
    (121, 999, 0.025) # 2.5% for DOC 120+
]

# Feeding frequency by DOC
FREQUENCY_TABLE = [
    (0, 30, 4),    # 4 meals/day
    (31, 60, 4),
    (61, 90, 3),
    (91, 120, 3),
    (121, 999, 2),
]


def get_base_feed_rate(doc: int) -> float:
    """Get feeding percentage based on DOC."""
    for start, end, rate in FEED_RATE_TABLE:
        if start <= doc <= end:
            return rate
    return 0.03


def get_feeding_frequency(doc: int) -> int:
    """Get recommended meals per day based on DOC."""
    for start, end, freq in FREQUENCY_TABLE:
        if start <= doc <= end:
            return freq
    return 3


def calculate_feed_recommendation(
    biomass_kg: float,
    doc: int,
    fcr: Optional[float],
    dissolved_oxygen: Optional[float] = None,
    ammonia: Optional[float] = None,
    ph: Optional[float] = None,
    recent_mortality_trend: Optional[float] = None,  # ratio of recent vs average
    current_daily_feed: float = 0.0,
) -> dict:
    """
    Calculate recommended feed for tomorrow.

    Returns:
        dict with recommended_feed_kg, change_percent, reasons, etc.
    """
    if biomass_kg <= 0:
        return {
            "recommended_feed_kg": 0.0,
            "current_feed_kg": current_daily_feed,
            "change_percent": 0.0,
            "feeding_frequency": get_feeding_frequency(doc),
            "reasons": ["No biomass data available — enter ABW to get recommendations."],
            "fcr_status": "unknown",
        }

    base_rate = get_base_feed_rate(doc)
    base_feed = biomass_kg * base_rate
    correction = 1.0
    reasons = []

    # ─── FCR-based corrections ───
    fcr_status = "unknown"
    if fcr is not None:
        if fcr <= 1.3:
            fcr_status = "excellent"
            reasons.append(f"✅ FCR is excellent ({fcr:.2f}) — feeding efficiency is great.")
        elif fcr <= 1.6:
            fcr_status = "good"
            reasons.append(f"👍 FCR is good ({fcr:.2f}) — maintain current regime.")
        elif fcr <= 1.8:
            fcr_status = "concerning"
            correction *= 0.85
            reasons.append(f"⚠️ FCR rising ({fcr:.2f}) — reducing feed by 15% to improve efficiency.")
        else:
            fcr_status = "critical"
            correction *= 0.75
            reasons.append(f"🔴 FCR is high ({fcr:.2f}) — reducing feed by 25%. Check for disease/overfeeding.")

    # ─── Water quality corrections ───
    if dissolved_oxygen is not None:
        if dissolved_oxygen < 3.0:
            correction *= 0.50
            reasons.append(f"🚨 Critical DO ({dissolved_oxygen:.1f} mg/L) — cutting feed by 50%. Activate aerators NOW!")
        elif dissolved_oxygen < 4.0:
            correction *= 0.70
            reasons.append(f"⚠️ Low DO ({dissolved_oxygen:.1f} mg/L) — reducing feed by 30%. Increase aeration.")
        elif dissolved_oxygen < 5.0:
            correction *= 0.90
            reasons.append(f"📉 DO slightly low ({dissolved_oxygen:.1f} mg/L) — reducing feed by 10%.")

    if ammonia is not None and ammonia > 0.1:
        if ammonia > 0.5:
            correction *= 0.60
            reasons.append(f"🚨 Ammonia critical ({ammonia:.2f} mg/L) — reducing feed by 40%. Water exchange needed!")
        else:
            correction *= 0.80
            reasons.append(f"⚠️ Elevated ammonia ({ammonia:.2f} mg/L) — reducing feed by 20%.")

    if ph is not None:
        if ph < 7.0 or ph > 9.0:
            correction *= 0.80
            reasons.append(f"⚠️ pH out of range ({ph:.1f}) — reducing feed by 20%. Correct water chemistry.")
        elif ph < 7.5 or ph > 8.5:
            correction *= 0.90
            reasons.append(f"📉 pH slightly off ({ph:.1f}) — minor feed reduction of 10%.")

    # ─── Mortality-based corrections ───
    if recent_mortality_trend is not None and recent_mortality_trend > 2.0:
        correction *= 0.50
        reasons.append(f"🚨 Mortality spike detected ({recent_mortality_trend:.1f}× normal) — halving feed. Investigate immediately.")
    elif recent_mortality_trend is not None and recent_mortality_trend > 1.5:
        correction *= 0.80
        reasons.append(f"⚠️ Mortality elevated ({recent_mortality_trend:.1f}× normal) — reducing feed by 20%.")

    recommended_feed = round(base_feed * correction, 2)
    frequency = get_feeding_frequency(doc)

    # Calculate change from current
    if current_daily_feed > 0:
        change_pct = round(((recommended_feed - current_daily_feed) / current_daily_feed) * 100, 1)
    else:
        change_pct = 0.0

    if not reasons:
        reasons.append("✅ All parameters normal — feed at standard rate.")

    return {
        "recommended_feed_kg": recommended_feed,
        "current_feed_kg": current_daily_feed,
        "change_percent": change_pct,
        "feeding_frequency": frequency,
        "reasons": reasons,
        "fcr_status": fcr_status,
    }
