"""
Harvest planner engine.
Calculates optimal harvest timing using marginal profit analysis.
"""
from typing import List, Optional


def calculate_harvest_scenarios(
    current_biomass_kg: float,
    current_abw_g: float,
    adg: float,
    surviving_count: int,
    daily_mortality_rate: float,  # fraction, e.g. 0.001 = 0.1%/day
    total_feed_cost_so_far: float,
    feed_cost_per_kg: float,
    default_selling_price: float,
    doc: int,
    daily_feed_kg: float,
    forecast_days: List[int] = None,
    market_prices: dict = None,
) -> dict:
    """
    Generate harvest scenarios comparing profit at different harvest timings.

    Args:
        current_biomass_kg: Current estimated biomass
        current_abw_g: Current average body weight
        adg: Average daily growth rate (g/day)
        surviving_count: Current number of surviving shrimp
        daily_mortality_rate: Expected daily mortality as fraction
        total_feed_cost_so_far: Cumulative feed cost to date
        feed_cost_per_kg: Cost of feed per kg
        default_selling_price: Default Market price per kg shrimp
        doc: Current day of culture
        daily_feed_kg: Current daily feed amount in kg
        forecast_days: List of days to project forward (default: 0,5,10,15,20,30)

    Returns:
        dict with scenarios, optimal timing, and recommendation
    """
    if forecast_days is None:
        forecast_days = [0, 5, 10, 15, 20, 25, 30]

    scenarios = []
    best_profit = float("-inf")
    optimal_day = 0

    for n_days in forecast_days:
        if n_days == 0:
            # Harvest now
            selling_price = default_selling_price
            if market_prices and current_abw_g > 0:
                count = int(1000 / current_abw_g)
                closest_count = min(market_prices.keys(), key=lambda k: abs(k - count))
                selling_price = market_prices[closest_count]

            revenue = current_biomass_kg * selling_price
            profit = revenue - total_feed_cost_so_far
            scenarios.append({
                "days_from_now": 0,
                "projected_abw_g": round(current_abw_g, 2),
                "projected_biomass_kg": round(current_biomass_kg, 2),
                "projected_survival": round(
                    (surviving_count / max(surviving_count, 1)) * 100, 1  # 100% of current
                ),
                "total_feed_cost": round(total_feed_cost_so_far, 2),
                "total_revenue": round(revenue, 2),
                "total_profit": round(profit, 2),
                "profit_per_kg": round(profit / max(current_biomass_kg, 0.1), 2),
                "projected_fcr": round(total_feed_cost_so_far / feed_cost_per_kg / max(current_biomass_kg, 0.1), 2)
                if feed_cost_per_kg > 0 else 0,
            })
            if profit > best_profit:
                best_profit = profit
                optimal_day = 0
        else:
            # Project forward
            projected_abw = current_abw_g + (adg * n_days)

            # Mortality reduces surviving count
            projected_surviving = int(surviving_count * ((1 - daily_mortality_rate) ** n_days))
            projected_surviving = max(projected_surviving, 0)

            projected_biomass = (projected_surviving * projected_abw) / 1000

            # Additional feed cost
            # Feed increases slightly as shrimp grow — use average of current and projected
            avg_daily_feed = daily_feed_kg * (1 + 0.02 * n_days / 10)  # slight growth adjustment
            additional_feed_cost = avg_daily_feed * n_days * feed_cost_per_kg
            total_feed_cost = total_feed_cost_so_far + additional_feed_cost

            # Revenue
            selling_price = default_selling_price
            if market_prices and projected_abw > 0:
                count = int(1000 / projected_abw)
                closest_count = min(market_prices.keys(), key=lambda k: abs(k - count))
                selling_price = market_prices[closest_count]

            revenue = projected_biomass * selling_price
            profit = revenue - total_feed_cost

            # Projected FCR
            total_feed_kg = (total_feed_cost_so_far / max(feed_cost_per_kg, 1)) + (avg_daily_feed * n_days)
            projected_fcr = total_feed_kg / max(projected_biomass, 0.1) if projected_biomass > 0 else 0

            # Survival relative to original surviving count
            survival_pct = round((projected_surviving / max(surviving_count, 1)) * 100, 1)

            scenarios.append({
                "days_from_now": n_days,
                "projected_abw_g": round(projected_abw, 2),
                "projected_biomass_kg": round(projected_biomass, 2),
                "projected_survival": survival_pct,
                "total_feed_cost": round(total_feed_cost, 2),
                "total_revenue": round(revenue, 2),
                "total_profit": round(profit, 2),
                "profit_per_kg": round(profit / max(projected_biomass, 0.1), 2),
                "projected_fcr": round(projected_fcr, 2),
            })

            if profit > best_profit:
                best_profit = profit
                optimal_day = n_days

    # Generate recommendation
    harvest_now_profit = scenarios[0]["total_profit"]
    if optimal_day == 0:
        recommendation = (
            "🎯 Harvest NOW for maximum profit. Feed costs are outpacing growth, "
            "and continuing the cycle will reduce returns."
        )
    elif optimal_day <= 5:
        extra = best_profit - harvest_now_profit
        recommendation = (
            f"📅 Optimal harvest in {optimal_day} days — potential ₹{extra:,.0f} extra profit. "
            f"Monitor FCR closely; if it rises above 1.8, harvest early."
        )
    elif optimal_day <= 15:
        extra = best_profit - harvest_now_profit
        recommendation = (
            f"📅 Wait {optimal_day} days for optimal profit — ₹{extra:,.0f} more than harvesting now. "
            f"Shrimp still growing efficiently. Maintain current feed regime."
        )
    else:
        extra = best_profit - harvest_now_profit
        recommendation = (
            f"🌱 Shrimp still in active growth phase. Optimal harvest in ~{optimal_day} days "
            f"for ₹{extra:,.0f} additional profit. Keep monitoring health and water quality."
        )

    return {
        "scenarios": scenarios,
        "optimal_harvest_day": optimal_day,
        "optimal_profit": round(best_profit, 2),
        "harvest_now_profit": round(harvest_now_profit, 2),
        "recommendation": recommendation,
    }
