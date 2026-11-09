# PHASE 5.1: RECOMMENDATION ENGINE FORMULA SPECIFICATION
## Local Event Calendar Management System (EventHub)

---

## 1. Master Recommendation Scoring Formula

The EventHub personalized event recommendation engine calculates a normalized affinity score $S$ for each candidate event according to the following multi-factor linear composite:

$$S = 0.40C + 0.25G + 0.20P + 0.15T$$

Where:
- $C \in [0, 100]$: Category Affinity Score
- $G \in [0, 100]$: Geographic Relevance Score
- $P \in [0, 100]$: Popularity Score
- $T \in [0, 100]$: Temporal Relevance Score

### Weight Proof & Bounds
$$\sum w_i = 0.40 + 0.25 + 0.20 + 0.15 = 1.00$$

Since $\forall i, 0 \le X_i \le 100$:
$$0 \le S \le 100$$

---

## 2. Component Formulas & Mathematical Definitions

### 2.1 Category Affinity Score ($C$)
Measures the user's historical engagement with the specific category of the candidate event.

$$C = \min(100, 3B + 2F)$$

Where:
- $B \in \mathbb{N}_0$: Number of previous confirmed bookings made by the user in this event category.
- $F \in \mathbb{N}_0$: Number of active favorites/bookmarks held by the user in this event category.
- Coefficients: Bookings are weighted higher ($3\times$) than bookmarks ($2\times$) because confirmed RSVPs indicate stronger intent.
- Bound: Strictly capped at 100.

---

### 2.2 Geographic Relevance Score ($G$)

#### Primary Method: Haversine Geodesic Distance
When both user coordinates $(\phi_1, \lambda_1)$ and event venue coordinates $(\phi_2, \lambda_2)$ are populated, the great-circle distance $d$ in kilometers is computed:

$$a = \sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_1) \cos(\phi_2) \sin^2\left(\frac{\Delta \lambda}{2}\right)$$

$$d = 2R \times \text{atan2}\left(\sqrt{a}, \sqrt{1 - a}\right)$$

Where:
- $\phi_1, \phi_2$: Latitudes converted to radians.
- $\lambda_1, \lambda_2$: Longitudes converted to radians.
- $R = 6371\text{ km}$ (mean radius of Earth).

The normalized geographic score is:
$$G = 100 \times \max\left(0, 1 - \frac{d}{D}\right)$$
Where $D = 50\text{ km}$ is the maximum recommendation radius. Any venue located beyond $50\text{ km}$ yields $G = 0$.

#### Documented Fallback: City Match
When exact coordinates are absent, the system falls back to municipality matching:
$$G = \begin{cases} 100 & \text{if } \text{user.city} = \text{event.city} \text{ (case-insensitive)} \\ 0 & \text{otherwise} \end{cases}$$

---

### 2.3 Popularity Score ($P$)
Reflects social proof and event demand based on capacity occupancy:

$$\text{Fill Ratio (\%)} = \left(\frac{\text{Confirmed Registrations}}{\text{Maximum Capacity}}\right) \times 100$$

$$P = \begin{cases} \min(100, \text{Fill Ratio}) & \text{if } \text{Maximum Capacity} > 0 \\ 0 & \text{if } \text{Maximum Capacity} \le 0 \end{cases}$$

---

### 2.4 Temporal Relevance Score ($T$)
Prioritizes events occurring in the immediate horizon over distant months:

Let $\Delta t$ be the fractional days remaining until event start:
$$\Delta t = \frac{\text{startDate} - \text{now}}{86,400,000\text{ ms}}$$

$$T = \begin{cases} 100 \times \max\left(0, 1 - \frac{\Delta t}{10}\right) & \text{if } 0 \le \Delta t \le 10 \\ 0 & \text{if } \Delta t > 10 \text{ or } \Delta t < 0 \end{cases}$$

---

## 3. Unauthenticated Visitor Scoring Model

When an unauthenticated user visits the platform, category affinity ($C = 0$) and user coordinates ($G = 0$) cannot be established. The system applies a normalized composite based on crowd popularity and temporal urgency:

$$S_{\text{unauth}} = 0.55P + 0.45T \in [0, 100]$$

---

## 4. Exclusion & Eligibility Pipeline

Before computing scores, events are passed through strict exclusion gates:
1. `status !== 'PUBLISHED'`: Draft, cancelled, or rejected events are excluded.
2. `startDate < now`: Past or ongoing completed events are excluded.
3. `eventId IN user.registrations`: Events for which the user already holds a ticket are excluded.
4. `organizerId === user.id`: Events created by the user are excluded.

---

## 5. Explainable Rationale Mapping

Each recommended event displays a human-readable badge determined by the dominant weighted component:

| Dominant Factor | Condition | Displayed Badge Text |
| :--- | :--- | :--- |
| **Category Affinity** | $0.40C$ is highest and $C > 0$ | *"Because you like [Category Name]"* |
| **Geographic Proximity**| $0.25G$ is highest and $G > 0$ | *"Popular near you in [City]"* |
| **Social Momentum** | $0.20P$ is highest and $P \ge 60$ | *"Fast Selling & Highly Anticipated"* |
| **Temporal Urgency** | $0.15T$ is highest and $T > 0$ | *"Happening This Week"* (or *"Starting Soon"*) |
| **Default Fallback** | All factors equal or low | *"Recommended for you"* |

