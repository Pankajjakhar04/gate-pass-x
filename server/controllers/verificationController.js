const { z } = require('zod');
const ApiError = require('../utils/ApiError');
const { verifyPass } = require('../services/verificationService');

const verifySchema = z.object({ qrToken: z.string().optional(), passId: z.string().optional() }).refine((data) => data.qrToken || data.passId, { message: 'qrToken or passId is required' });

async function verify(req, res) {
  let body = req.body;
  if (typeof body.qrToken === 'string' && body.qrToken.trim().startsWith('{')) {
    try {
      const payload = JSON.parse(body.qrToken);
      body = { ...body, qrToken: payload.t, passId: body.passId || payload.p };
    } catch (_error) {
      throw new ApiError(422, 'VALIDATION_ERROR', 'Invalid QR payload');
    }
  }
  const parsed = verifySchema.safeParse(body);
  if (!parsed.success) throw new ApiError(422, 'VALIDATION_ERROR', 'qrToken or passId is required');
  const result = await verifyPass({ ...parsed.data, actor: req.user, ip: req.ip });
  return res.json({ success: true, data: result });
}

module.exports = { verify };