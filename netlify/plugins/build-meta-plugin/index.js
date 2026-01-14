module.exports = {
  onPreBuild({ utils }) {
    const sha = (process.env.COMMIT_SHA || process.env.COMMIT_REF || "unknown").trim();
    const time = new Date().toISOString();

    process.env.VITE_COMMIT_SHA = sha;
    process.env.VITE_BUILD_TIME = time;

    utils.status.show({
      title: "Build metadata injected",
      summary: `VITE_COMMIT_SHA=${sha}, VITE_BUILD_TIME=${time}`,
    });
  },
};
