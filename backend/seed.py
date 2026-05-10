"""
Seed script — generates realistic 90-day sample data for demo purposes.
Simulates a typical Vannamei shrimp culture cycle.
"""
import asyncio
import random
from datetime import date, timedelta, datetime

from app.database import engine, async_session, Base
from app.models import User, Pond, DailyLog, Alert
from app.services.calculations import compute_all_metrics
from app.services.risk_engine import analyze_risks


async def seed():
    """Generate realistic demo data."""
    print("[SHRIMP] Seeding Vannamei Shrimp Profit Optimizer database...")

    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as db:
        # ─── Create demo user ───
        user = User(
            id="demo-user-001",
            phone="+919876543210",
            name="Ravi Kumar",
            farm_name="AquaGold Farms",
        )
        db.add(user)

        # ─── Create 2 ponds ───
        stocking_date_1 = date.today() - timedelta(days=90)
        stocking_date_2 = date.today() - timedelta(days=55)

        pond1 = Pond(
            id="pond-001",
            owner_id=user.id,
            name="Pond A1 — Main",
            area_m2=5000,
            stocking_date=stocking_date_1,
            pl_stocked=300000,
            salinity_ppt=18.0,
            feed_type="CP Aquaculture Premium",
            feed_cost_per_kg=68.0,
            selling_price_per_kg=380.0,
        )

        pond2 = Pond(
            id="pond-002",
            owner_id=user.id,
            name="Pond B2 — Growth",
            area_m2=3500,
            stocking_date=stocking_date_2,
            pl_stocked=200000,
            salinity_ppt=15.0,
            feed_type="Uni-President Feed",
            feed_cost_per_kg=62.0,
            selling_price_per_kg=370.0,
        )

        db.add_all([pond1, pond2])
        await db.flush()

        # ─── Generate 90 days of data for Pond A1 ───
        print("  [DATA] Generating 90 days for Pond A1...")
        await _generate_pond_data(db, pond1, 90)

        # ─── Generate 55 days of data for Pond B2 ───
        print("  [DATA] Generating 55 days for Pond B2...")
        await _generate_pond_data(db, pond2, 55)

        await db.commit()

    print("[OK] Seed complete!")
    print(f"   Demo user: +919876543210 (OTP: 123456)")
    print(f"   User ID: demo-user-001")
    print(f"   Ponds: pond-001 (90 DOC), pond-002 (55 DOC)")


async def _generate_pond_data(db, pond: Pond, days: int):
    """Generate realistic daily log data for a pond."""
    cumulative_feed = 0.0
    cumulative_mortality = 0

    # Vannamei growth curve (realistic ABW progression)
    # PL starts ~0.01g, reaches ~20-25g by DOC 90-100
    for day_num in range(1, days + 1):
        log_date = pond.stocking_date + timedelta(days=day_num)
        doc = day_num

        # ─── Simulate ABW growth (sigmoid-like curve) ───
        # Typical: 0.01g → 25g over 100 days
        if doc <= 10:
            abw = 0.01 + (doc * 0.05)  # Very small PLs
        elif doc <= 30:
            abw = 0.5 + ((doc - 10) * 0.25)  # Early growth: ~0.25 g/day
        elif doc <= 60:
            abw = 5.5 + ((doc - 30) * 0.35)  # Peak growth: ~0.35 g/day
        elif doc <= 90:
            abw = 16.0 + ((doc - 60) * 0.25)  # Slowing growth: ~0.25 g/day
        else:
            abw = 23.5 + ((doc - 90) * 0.15)  # Late growth: ~0.15 g/day

        # Add natural variation (±10%)
        abw *= random.uniform(0.92, 1.08)
        abw = round(abw, 2)

        # ─── Simulate mortality ───
        if doc <= 15:
            daily_mortality = random.randint(200, 500)  # Higher early mortality
        elif doc <= 60:
            daily_mortality = random.randint(20, 100)
        else:
            daily_mortality = random.randint(10, 80)

        # Occasional spike (simulate mild disease event around DOC 45-50)
        if 45 <= doc <= 48 and pond.id == "pond-001":
            daily_mortality = random.randint(300, 600)

        cumulative_mortality += daily_mortality
        surviving = max(0, pond.pl_stocked - cumulative_mortality)

        # ─── Simulate feed ───
        biomass_est = (surviving * abw) / 1000

        if doc <= 30:
            feed_pct = 0.08
        elif doc <= 60:
            feed_pct = 0.06
        elif doc <= 90:
            feed_pct = 0.04
        else:
            feed_pct = 0.03

        daily_feed = biomass_est * feed_pct * random.uniform(0.9, 1.1)
        daily_feed = round(max(daily_feed, 0.5), 2)
        cumulative_feed += daily_feed

        # ─── Simulate water quality ───
        # DO: 5-8 normally, occasional dips
        do = round(random.uniform(5.5, 7.5), 1)
        if doc > 70 and random.random() < 0.1:
            do = round(random.uniform(3.5, 4.5), 1)  # Occasional low DO

        # pH: 7.5-8.5 normally
        ph = round(random.uniform(7.6, 8.3), 1)

        # Ammonia: usually <0.05, sometimes spikes
        ammonia = round(random.uniform(0.01, 0.06), 3)
        if doc > 50 and random.random() < 0.08:
            ammonia = round(random.uniform(0.1, 0.3), 3)

        # Temperature: 28-32°C
        temp = round(random.uniform(28.0, 31.5), 1)

        # ─── Compute metrics ───
        metrics = compute_all_metrics(
            stocking_date=pond.stocking_date,
            pl_stocked=pond.pl_stocked,
            log_date=log_date,
            total_feed_kg=cumulative_feed,
            cumulative_mortality=cumulative_mortality,
            avg_body_weight_g=abw,
        )
        metrics.pop("doc", None)  # Remove doc since we set it explicitly

        log = DailyLog(
            pond_id=pond.id,
            log_date=log_date,
            doc=doc,
            feed_given_kg=daily_feed,
            avg_body_weight_g=abw,
            mortality_count=daily_mortality,
            dissolved_oxygen=do,
            ph=ph,
            ammonia=ammonia,
            temperature_c=temp,
            **metrics,
        )
        db.add(log)

    # ─── Generate some alerts based on recent data ───
    # Add a few sample alerts
    alerts = [
        Alert(
            pond_id=pond.id,
            alert_date=date.today() - timedelta(days=1),
            severity="warning",
            category="feed",
            title="FCR Trending Up",
            message=f"FCR has increased over the last 5 days. Consider optimizing feed amounts.",
        ),
        Alert(
            pond_id=pond.id,
            alert_date=date.today(),
            severity="info",
            category="harvest",
            title="Harvest Window Approaching",
            message=f"DOC {days}: Shrimp reaching market size. Run harvest planner for optimal timing.",
        ),
    ]

    if pond.id == "pond-001":
        alerts.append(Alert(
            pond_id=pond.id,
            alert_date=date.today(),
            severity="critical",
            category="water",
            title="Low DO Detected Yesterday",
            message="DO dropped to 3.8 mg/L. Ensure aerators are running continuously at night.",
        ))

    for a in alerts:
        db.add(a)


if __name__ == "__main__":
    asyncio.run(seed())
