export function getHealth(_req, res) {
    res.status(200).json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString(),
    });
}
//# sourceMappingURL=health.controller.js.map