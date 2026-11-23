import { Activity, Team, User, Workout } from '../models/index.js';

function badRequest(message: string) {
  return Object.assign(new Error(message), { status: 400 });
}

function notFound(message: string) {
  return Object.assign(new Error(message), { status: 404 });
}

function isObjectId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);
}

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: unknown) {
  if (!input || typeof input !== 'object') throw badRequest('Activity details are required');
  const { userId, teamId, type, minutes } = input as Record<string, unknown>;
  if (!isObjectId(userId) || !isObjectId(teamId)) throw badRequest('Valid userId and teamId are required');
  if (typeof type !== 'string' || !type.trim()) throw badRequest('Activity type is required');
  if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes < 1) {
    throw badRequest('Minutes must be a positive number');
  }
  const [user, team] = await Promise.all([User.findById(userId), Team.findById(teamId)]);
  if (!user || !team) throw badRequest('The specified user and team must exist');
  return Activity.create({
    user: user._id,
    team: team._id,
    type: type.trim(),
    minutes,
    points: minutes,
    occurredAt: new Date(),
  });
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  if (!input || typeof input !== 'object') throw badRequest('Team details are required');
  const { name, mascot, members } = input as Record<string, unknown>;
  if (typeof name !== 'string' || !name.trim()) throw badRequest('Team name is required');
  if (typeof mascot !== 'string' || !mascot.trim()) throw badRequest('Team mascot is required');
  if (members !== undefined && (!Array.isArray(members) || !members.every(isObjectId))) {
    throw badRequest('Team members must be valid user IDs');
  }
  const memberIds = (members ?? []) as string[];
  const users = memberIds.length ? await User.find({ _id: { $in: memberIds } }).select('_id') : [];
  if (users.length !== memberIds.length) throw badRequest('All team members must exist');
  return Team.create({ name: name.trim(), mascot: mascot.trim(), members: memberIds });
}

export async function getLeaderboard() {
  const [teams, totals] = await Promise.all([
    Team.find().lean(),
    Activity.aggregate<{ _id: unknown; totalPoints: number }>([
      { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
    ]),
  ]);
  const pointsByTeam = new Map(totals.map(({ _id, totalPoints }) => [String(_id), totalPoints]));
  return teams
    .map((team) => ({ teamName: team.name, totalPoints: pointsByTeam.get(String(team._id)) ?? 0 }))
    .sort((left, right) => right.totalPoints - left.totalPoints || left.teamName.localeCompare(right.teamName))
    .map((team, index) => ({ ...team, rank: index + 1 }));
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail.toLowerCase() }).lean();
  if (!user) throw notFound(`No user found for ${userEmail}`);
  const recentActivity = await Activity.findOne({ user: user._id }).sort({ occurredAt: -1 }).lean();
  const activityFocus = recentActivity
    ? ({ run: 'endurance', cycle: 'endurance', walk: 'endurance', strength: 'strength', yoga: 'mobility' } as Record<string, string>)[recentActivity.type.toLowerCase()]
    : undefined;
  const focus = activityFocus ?? user.fitnessGoal;
  const workouts = await Workout.find().lean();
  return workouts
    .map((workout) => ({
      ...workout,
      reason: workout.focus.toLowerCase() === focus.toLowerCase()
        ? `Recommended to support your ${focus} goal and recent activity.`
        : `A ${workout.focus} option to complement your ${user.fitnessGoal} goal.`,
      relevance: workout.focus.toLowerCase() === focus.toLowerCase() ? 1 : 0,
    }))
    .sort((left, right) => right.relevance - left.relevance || left.title.localeCompare(right.title))
    .map(({ relevance: _relevance, ...workout }) => workout);
}

export { User };
