import { Router } from 'express';
import Deps from '../../../utils/deps';
import Bots from '../../../data/bots';
import BotLogs from '../../../data/bot-logs';
import { APIError, sendError } from '../../modules/api-utils';
import BotTokens from '../../../data/bot-tokens';
import { updateManageableBots, updateUser, validateBotManager } from '../../modules/middleware';
import Stats from '../../modules/stats';
import { SavedBot } from '../../../data/models/bot';

export const router = Router({ mergeParams: true });

const bots = Deps.get<Bots>(Bots);
const botTokens = Deps.get<BotTokens>(BotTokens);
const logs = Deps.get<BotLogs>(BotLogs);
const stats = Deps.get<Stats>(Stats);
      
router.get('/stats', validateBotExists, (req, res) => {
  const id = req.params.id;

  res.json({
    general: stats.general(id),
    topVoters: stats.topVoters(id),
    votes: stats.votes(id),
    recentVotes: stats.recentVotes(id)
  });
});

router.post('/stats', validateBotExists, validateAPIKey, async (req, res) => {
  try {
    const savedBot = await bots.get(req.params.id);
    savedBot.stats = req.body;
    await savedBot.save();    

    res.json(savedBot.stats);
  } catch (error) { sendError(res, error); }
});

router.get('/log', updateUser, updateManageableBots, validateBotManager, async(req, res) => {
  try {
    const log = await logs.get(req.params.id);
    res.json(log);
  } catch (error) { sendError(res, error); }
});

router.get('/key', updateUser, updateManageableBots, validateBotManager, async (req, res) => {
  try {
    const { token } = await botTokens.get(req.params.id);
    res.json(token);
  } catch (error) { sendError(res, error); }
});

router.get('/key/regen', updateUser, updateManageableBots, validateBotManager, async (req, res) => {
  try {
    const id = req.params.id;

    await botTokens.delete(id);
    const { token } = await botTokens.get(id);

    res.json(token);
  } catch (error) { sendError(res, error); }
});

async function validateBotExists(req, res, next) {
  const exists = await SavedBot.exists({ _id: req.params.id });
  return (exists)
    ? next()
    : sendError(res, new APIError('Bot not found', 404));
}

async function validateAPIKey(req, res, next) {
  const savedToken = await botTokens.get(req.params.id);
  return (savedToken.token === req.get('Authorization'))
    ? next()
    : sendError(res, new APIError('Invalid API token.', 401));
}
