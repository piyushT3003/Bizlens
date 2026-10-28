# Metric Registry Specification (METRICS.md)

*Single source of truth for all business calculations across BizLens. Dashboard, Ask BizLens, Reports, What-If, and Findings all derive their values strictly from this registry.*

| Metric ID | Display Name | Mathematical Formula | Required Roles | Polarity | Unit & Format |
|---|---|---|---|---|---|
| `revenue` | Total Revenue | `SUM(revenue)` or `SUM(price * quantity * (1 - discount))` | `revenue` OR (`price`, `quantity`) | Higher is better | Currency (`₹1.24 Cr`) |
| `cost` | Total Cost | `SUM(cost)` or `SUM(unit_cost * quantity)` | `cost` | Lower is better | Currency (`₹85.20 L`) |
| `profit` | Total Profit | `Total Revenue - Total Cost` | `revenue`, `cost` (or `profit`) | Higher is better | Currency (`₹38.80 L`) |
| `profit_margin_pct` | Profit Margin % | `(Total Profit / Total Revenue) * 100` | `revenue`, `cost` (or `profit`) | Higher is better | Percent (`31.29%`) |
| `orders` | Total Orders | `COUNT(DISTINCT order_id)` | `order_id` | Higher is better | Count (`18,420`) |
| `units_sold` | Units Sold | `SUM(quantity)` | `quantity` | Higher is better | Count (`42,100`) |
| `aov` | Average Order Value | `Total Revenue / Total Orders` | `revenue`, `order_id` | Higher is better | Currency (`₹673.18`) |
| `asp` | Avg Selling Price | `Total Revenue / Units Sold` | `revenue`, `quantity` | Neutral | Currency (`₹294.50`) |
| `discount_rate` | Avg Discount % | `AVG(discount) * 100` | `discount` | Lower is better | Percent (`8.45%`) |
| `revenue_per_customer`| Revenue / Customer | `Total Revenue / COUNT(DISTINCT customer)` | `revenue`, `customer` | Higher is better | Currency (`₹2,480.00`) |
| `repeat_customer_rate`| Repeat Customer Rate | `(Customers with >1 order / Total Customers) * 100` | `customer`, `order_id`, `date` | Higher is better | Percent (`24.8%`) |
| `period_growth` | Growth (PoP) | `((Value_current - Value_prev) / Value_prev) * 100` | Target metric roles + `date` | Higher is better | Percent (`+12.4%`) |
| `mom_growth` | Month-over-Month Growth | `((Value_m - Value_m_minus_1) / Value_m_minus_1) * 100` | Target metric roles + `date` | Higher is better | Percent (`+4.2%`) |
| `yoy_growth` | Year-over-Year Growth | `((Value_y - Value_y_minus_1) / Value_y_minus_1) * 100` | Target metric roles + `date` | Higher is better | Percent (`+18.7%`) |
| `share_of_total` | Share of Total | `(Dimension_Metric_Sum / Grand_Total) * 100` | Target metric roles + Dimension | Neutral | Percent (`42.1%`) |
| `contribution_to_change`| Contribution to Change| `((Segment_Delta / Total_Delta)) * 100` | Target metric roles + Dimension + `date` | Neutral | Percent (`78.4%`) |
| `top_n_concentration` | Top 3 Concentration | `(SUM(Top 3 Dimension Revenue) / Total Revenue) * 100` | `revenue` + Dimension | Lower is better | Percent (`64.5%`) |

### Quality Score Formula
$$QualityScore = 0.35 \times Completeness + 0.30 \times Validity + 0.20 \times Uniqueness + 0.15 \times Consistency$$
- **Completeness**: $1 - (\text{Null cells} / \text{Total cells})$
- **Validity**: Fraction of non-null values conforming to expected data type & valid range.
- **Uniqueness**: $1 - (\text{Duplicate rows} / \text{Total rows})$
- **Consistency**: Fraction of categories matching standardized canonical spellings without whitespace/casing drift.

### Health Score Waveform Formula (Pulse Line)
$$HealthScore = w_1 \times \text{MarginScore} + w_2 \times \text{GrowthScore} + w_3 \times \text{QualityScore} + w_4 \times \text{StabilityScore}$$
Where weights $w_i$ re-normalize over available components. If fewer than 2 components exist, the score displays "Not enough data to score".
