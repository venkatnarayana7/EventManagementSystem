window.EMS_CONFIG = Object.assign(
  {
    apiBaseUrl: "https://k9496zfg6j.execute-api.ap-south-1.amazonaws.com/prod/",
    cognitoRegion: "ap-south-1",
    userPoolId: "ap-south-1_3ew3v2eF2",
    userPoolClientId: "dggacjj0r9glpgedlfl3pvrci",
    frontendBaseUrl: "https://d30luc1e1xqtn2.cloudfront.net",
    mediaBaseUrl: "https://d3u5timg9hm9ps.cloudfront.net",
    realtimeWsUrl: "wss://a7b89fbloe.execute-api.ap-south-1.amazonaws.com/prod",
    dashboardPath: "/dashboard.html",
    teacherDashboardPath: "/teacher-dashboard.html",
    studentDashboardPath: "/student-dashboard.html",
    signInPath: "/index.html"
  },
  window.EMS_CONFIG || {}
);
