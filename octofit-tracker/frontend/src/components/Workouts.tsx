import { CapabilityCard } from './CapabilityCard.js';

type Suggestion = { title: string; focus: string; reason: string };

export default function Workouts() {
  return <CapabilityCard<Suggestion>
    title="Workout suggestions"
    description="Recommend workouts from activity patterns."
    path={`/api/workouts/suggestions/${encodeURIComponent('mona@example.com')}`}
    dataKey="suggestions"
    emptyText="No workout suggestions available."
    renderItem={(suggestion) => `${suggestion.title} (${suggestion.focus}) — ${suggestion.reason}`}
  />;
}
