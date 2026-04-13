window.EMS_TEACHER_DATA = (function () {
  const teacherProfile = {
    id: "T001",
    profileId: "EMS-TCH-T001",
    name: "Rahul Sharma",
    email: "rahul.sharma@lpu.edu.in",
    department: "Computer Science Engineering",
    empId: "EMP-2024-0142",
    specialization: "Machine Learning & AI",
    bio: "Assistant Professor with 6 years experience in AI and Data Science.",
    phone: "+91 98765 44321",
    dob: "1991-08-17",
    avatar: "",
    createdAt: "2024-05-11T10:30:00Z",
    notifications: {
      registrationAlerts: true,
      staffInvites: true,
      attendanceReminders: true,
      approvalUpdates: true,
      weeklySummary: false
    },
    settings: {
      displayName: "Rahul Sharma",
      language: "English",
      timezone: "Asia/Kolkata",
      dateFormat: "DD/MM/YYYY",
      showPublicName: true,
      bellBadge: true,
      soundEnabled: false,
      desktopNotifications: false,
      showProfileToTeachers: true,
      showDraftsToAdmins: false,
      shareAttendanceAnalytics: true,
      density: "comfortable"
    }
  };

  function createEvent(id, title, category, status, price, date, startTime, endTime, venue, department, maxCapacity, registrations, image, extra) {
    return Object.assign(
      {
        id: id,
        title: title,
        category: category,
        status: status,
        price: price,
        date: date,
        startTime: startTime,
        endTime: endTime,
        venue: venue,
        department: department,
        maxCapacity: maxCapacity,
        registrations: registrations,
        waitlisted: 0,
        cancelled: 0,
        attended: 0,
        image: image,
        description: title + " is a teacher portal showcase event built from the codex plan.",
        tags: [category, "EMS", "Teacher"],
        hostName: teacherProfile.name,
        hostDepartment: teacherProfile.department,
        registrationDeadline: date,
        staffCode: "EMS-" + id,
        joinedCoordinators: [],
        approvalReason: "",
        openToJoin: status === "approved"
      },
      extra || {}
    );
  }

  const myEvents = [
    createEvent("EVT-101", "AI Make Us Better", "Technology", "approved", 20, "2026-11-08", "09:00", "12:30", "Colombo 03, Jubilee Hall", "Computer Science Engineering", 120, 82, "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=80", {
      waitlisted: 6,
      joinedCoordinators: [{ id: "T010", name: "Aisha Kumar", department: "Information Technology" }, { id: "T011", name: "Karan Sethi", department: "Data Science" }]
    }),
    createEvent("EVT-102", "Balanced Diet Camp", "Health & Fitness", "approved", 6, "2026-12-12", "08:00", "11:00", "Nuwara Eliya, Main Hall", "Biotech", 90, 45, "https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=900&q=80", {
      waitlisted: 3,
      joinedCoordinators: [{ id: "T012", name: "Ritu Anand", department: "Biotech" }]
    }),
    createEvent("EVT-103", "Campus Startup Sprint", "Workshop", "pending", 0, "2026-10-26", "10:00", "15:00", "Innovation Lab", "Management", 100, 24, "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=900&q=80"),
    createEvent("EVT-104", "Robotics Demo Day", "Technology", "pending", 12, "2026-11-22", "14:00", "18:00", "Engineering Block A", "Mechanical", 80, 18, "https://images.unsplash.com/photo-1561144257-e32e8efc6c4f?auto=format&fit=crop&w=900&q=80"),
    createEvent("EVT-105", "Creative Media Lab", "Fashion", "draft", 10, "2026-12-02", "11:00", "16:00", "Media Studio 2", "Design", 60, 0, "https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=900&q=80"),
    createEvent("EVT-106", "Data Storytelling Studio", "Technology", "rejected", 15, "2026-09-12", "13:30", "17:00", "Analytics Hub", "Data Science", 75, 0, "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80", {
      approvalReason: "Please clarify budget breakdown and final venue approval before re-submitting."
    }),
    createEvent("EVT-107", "Future of Commerce Talk", "Workshop", "completed", 0, "2026-03-12", "16:00", "18:00", "Commerce Auditorium", "Business", 140, 110, "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=900&q=80", {
      waitlisted: 12,
      cancelled: 4,
      attended: 88,
      joinedCoordinators: [{ id: "T014", name: "Maya Pillai", department: "Commerce" }]
    }),
    createEvent("EVT-108", "Music and Mood Session", "Music", "completed", 5, "2026-02-09", "15:00", "18:00", "Open Air Theatre", "Psychology", 95, 72, "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=900&q=80", {
      waitlisted: 4,
      cancelled: 3,
      attended: 61,
      joinedCoordinators: [{ id: "T015", name: "Nitin Arora", department: "Psychology" }]
    }),
    createEvent("EVT-109", "Sustainable Futures Forum", "Outdoor & Adventure", "approved", 18, "2026-11-19", "09:30", "13:00", "Central Lawn Pavilion", "Environmental Science", 130, 96, "https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=900&q=80", {
      waitlisted: 10,
      joinedCoordinators: [{ id: "T020", name: "Geeta Rao", department: "Environmental Science" }]
    }),
    createEvent("EVT-110", "Research Poster Clinic", "Workshop", "draft", 0, "2026-12-16", "10:30", "14:30", "Research Commons", "Research Cell", 70, 0, "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=900&q=80"),
    createEvent("EVT-111", "Code and Coffee Meetup", "Technology", "approved", 0, "2026-10-14", "17:30", "20:00", "Block B Cafe", "Computer Science Engineering", 65, 54, "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80", {
      waitlisted: 5,
      cancelled: 1,
      joinedCoordinators: [{ id: "T018", name: "Ananya Kapoor", department: "IT" }]
    }),
    createEvent("EVT-112", "Urban Trek Leadership Camp", "Outdoor & Adventure", "pending", 35, "2026-12-28", "06:00", "18:00", "North Ridge Trail", "Physical Education", 50, 12, "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80")
  ];

  const allEvents = myEvents.concat([
    createEvent("EVT-201", "Food Exhibition", "Food & Culinary", "approved", 10, "2026-11-02", "15:00", "20:30", "Kandy, Digana Main Hall", "Hospitality", 250, 141, "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80", {
      hostName: "Dr. Aisha Kumar",
      hostDepartment: "Hospitality",
      joinedCoordinators: [{ id: teacherProfile.id, name: teacherProfile.name, department: teacherProfile.department }],
      waitlisted: 20,
      cancelled: 7
    }),
    createEvent("EVT-202", "Adventure Hiking", "Outdoor & Adventure", "approved", 100, "2026-02-14", "06:00", "13:00", "Kandy, Piduruthalagala Mountain", "Physical Education", 80, 75, "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=900&q=80", {
      hostName: "Prof. Milan De Silva",
      hostDepartment: "Physical Education",
      waitlisted: 3,
      cancelled: 2,
      attended: 68,
      openToJoin: false
    }),
    createEvent("EVT-203", "Fashion Empire", "Fashion", "approved", 5, "2026-11-27", "10:00", "17:00", "Dehiwala, Hill's Hall", "Design", 200, 191, "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80", {
      hostName: "Madhavi Iyer",
      hostDepartment: "Design",
      waitlisted: 8
    }),
    createEvent("EVT-204", "How to Camp", "Outdoor & Adventure", "approved", 60, "2026-12-10", "16:30", "21:30", "Badulla, Narangala Mountain", "Adventure Club", 110, 109, "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=900&q=80", {
      hostName: "Vikram Rao",
      hostDepartment: "Adventure Club",
      waitlisted: 4,
      cancelled: 2
    })
  ]);

  const myStudents = {
    "EVT-101": [
      { id: "S001", name: "Priya Patel", email: "priya.patel@lpu.edu.in", rollNo: "12009876", dept: "CSE", registeredAt: "2026-10-30 10:23", status: "registered" },
      { id: "S002", name: "Arjun Singh", email: "arjun.singh@lpu.edu.in", rollNo: "12009877", dept: "ECE", registeredAt: "2026-10-30 11:05", status: "registered" },
      { id: "S003", name: "Nikita Verma", email: "nikita.verma@lpu.edu.in", rollNo: "12009878", dept: "CSE", registeredAt: "2026-10-30 11:35", status: "registered" },
      { id: "S004", name: "Rohan Malhotra", email: "rohan.malhotra@lpu.edu.in", rollNo: "12009879", dept: "MBA", registeredAt: "2026-10-31 09:00", status: "waitlisted" },
      { id: "S005", name: "Megha Nair", email: "megha.nair@lpu.edu.in", rollNo: "12009880", dept: "CSE", registeredAt: "2026-10-31 09:40", status: "registered" },
      { id: "S006", name: "Kabir Joshi", email: "kabir.joshi@lpu.edu.in", rollNo: "12009881", dept: "IT", registeredAt: "2026-10-31 10:12", status: "cancelled" },
      { id: "S007", name: "Aditi Kapoor", email: "aditi.kapoor@lpu.edu.in", rollNo: "12009882", dept: "CSE", registeredAt: "2026-10-31 10:45", status: "registered" },
      { id: "S008", name: "Yash Gupta", email: "yash.gupta@lpu.edu.in", rollNo: "12009883", dept: "BCA", registeredAt: "2026-10-31 11:09", status: "registered" }
    ],
    "EVT-107": [
      { id: "S101", name: "Isha Bansal", email: "isha.bansal@lpu.edu.in", rollNo: "12006721", dept: "MBA", registeredAt: "2026-03-01 12:15", status: "registered" },
      { id: "S102", name: "Dev Kumar", email: "dev.kumar@lpu.edu.in", rollNo: "12006722", dept: "BBA", registeredAt: "2026-03-01 13:05", status: "registered" },
      { id: "S103", name: "Tanvi Sharma", email: "tanvi.sharma@lpu.edu.in", rollNo: "12006723", dept: "Commerce", registeredAt: "2026-03-02 09:26", status: "registered" }
    ]
  };

  const attendanceData = {
    "EVT-101": { status: "in_progress", submittedAt: "", marks: [{ studentId: "S001", status: "present" }, { studentId: "S002", status: "absent" }] },
    "EVT-107": { status: "submitted", submittedAt: "2026-03-12 07:00 PM", marks: [{ studentId: "S101", status: "present" }, { studentId: "S102", status: "present" }, { studentId: "S103", status: "absent" }] }
  };

  const staffInvites = [
    { id: "INV001", eventId: "EVT-201", eventTitle: "Food Exhibition", hostName: "Dr. Aisha Kumar", date: "Nov 2, 2026", image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=80", status: "pending" },
    { id: "INV002", eventId: "EVT-204", eventTitle: "How to Camp", hostName: "Vikram Rao", date: "Dec 10, 2026", image: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=400&q=80", status: "pending" }
  ];

  return {
    teacherProfile: teacherProfile,
    myEvents: myEvents,
    allEvents: allEvents,
    myStudents: myStudents,
    attendanceData: attendanceData,
    staffInvites: staffInvites,
    pendingAttendanceEvents: ["EVT-107", "EVT-108", "EVT-202"]
  };
})();
