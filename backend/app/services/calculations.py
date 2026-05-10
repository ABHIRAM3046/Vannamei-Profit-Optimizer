"""
Core calculation service for shrimp farming metrics.
Implements industry-standard formulas for Vannamei (L. vannamei) aquaculture.
"""
from datetime import date
from typing import List, Optional, Tuple


def calculate_doc(stocking_date: date, current_date: date = None) -> int:
    """Day of Culture: days since stocking."""
    if current_date is None:
        current_date = date.today()
    return (current_date - stocking_date).days


def calculate_cumulative_mortality(daily_mortalities: List[int]) -> int:
    """Sum of all daily mortality counts."""
    return sum(daily_mortalities)


def calculate_surviving_count(pl_stocked: int, cumulative_mortality: int) -> int:
    """Estimated number of shrimp still alive."""
    return max(0, pl_stocked - cumulative_mortality)


def calculate_survival_rate(pl_stocked: int, surviving_count: int) -> float:
    """Survival rate as percentage."""
    if pl_stocked <= 0:
        return 0.0
    return round((surviving_count / pl_stocked) * 100, 2)


def calculate_biomass_kg(surviving_count: int, avg_body_weight_g: float) -> float:
    """Total biomass in kg = surviving shrimp × ABW / 1000."""
    if avg_body_weight_g is None or avg_body_weight_g <= 0:
        return 0.0
    return round((surviving_count * avg_body_weight_g) / 1000, 2)


def calculate_fcr(total_feed_kg: float, biomass_kg: float) -> Optional[float]:
    """
    Feed Conversion Ratio = Total Feed Used / Current Biomass.
    Lower is better. Target: 1.1–1.3.
    """
    if biomass_kg <= 0 or total_feed_kg <= 0:
        return None
    return round(total_feed_kg / biomass_kg, 3)


def calculate_adg(avg_body_weight_g: float, doc: int) -> Optional[float]:
    """
    Average Daily Growth = ABW / DOC (simplified, assuming PL starts near 0g).
    Returns g/day.
    """
    if doc <= 0 or avg_body_weight_g is None or avg_body_weight_g <= 0:
        return None
    return round(avg_body_weight_g / doc, 4)


def calculate_adg_between(
    abw_current: float, abw_previous: float, days_between: int
) -> Optional[float]:
    """ADG between two sampling dates."""
    if days_between <= 0:
        return None
    return round((abw_current - abw_previous) / days_between, 4)


def get_fcr_status(fcr: Optional[float]) -> str:
    """Color-code FCR for dashboard display."""
    if fcr is None:
        return "unknown"
    if fcr <= 1.3:
        return "excellent"
    if fcr <= 1.6:
        return "good"
    if fcr <= 1.8:
        return "concerning"
    return "critical"


def compute_all_metrics(
    stocking_date: date,
    pl_stocked: int,
    log_date: date,
    total_feed_kg: float,
    cumulative_mortality: int,
    avg_body_weight_g: Optional[float],
) -> dict:
    """
    Compute all metrics for a single daily log entry.
    Returns a dict with all calculated fields.
    """
    doc = calculate_doc(stocking_date, log_date)
    surviving = calculate_surviving_count(pl_stocked, cumulative_mortality)
    sr = calculate_survival_rate(pl_stocked, surviving)
    biomass = calculate_biomass_kg(surviving, avg_body_weight_g) if avg_body_weight_g else 0.0
    fcr = calculate_fcr(total_feed_kg, biomass)
    adg = calculate_adg(avg_body_weight_g, doc)

    return {
        "doc": doc,
        "cumulative_feed_kg": round(total_feed_kg, 2),
        "cumulative_mortality": cumulative_mortality,
        "surviving_count": surviving,
        "survival_rate": sr,
        "biomass_kg": biomass,
        "fcr": fcr,
        "adg": adg,
    }
