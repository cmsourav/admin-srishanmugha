import React, { useEffect, useState } from "react";
import { collection, getDocs, query, where, onSnapshot } from "firebase/firestore";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import "../styles/Dashboard.css";
import { FiUser, FiBook, FiClock, FiChevronLeft, FiChevronRight, FiLogOut, FiBell } from "react-icons/fi";
import Unauthorized from "../components/Unauthorized";

const Dashboard = () => {
  const [students, setStudents] = useState([]);
  const [user, setUser] = useState(null);
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState('default');
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);

  const studentsPerPage = 5;
  const navigate = useNavigate();

  const handleLogout = () => {
    const auth = getAuth();
    signOut(auth)
      .then(() => navigate("/"))
      .catch((error) => console.error("Logout error:", error));
  };

  // Check and request notification permission
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const requestNotificationPermission = () => {
    Notification.requestPermission().then(permission => {
      setNotificationPermission(permission);
      if (permission === 'granted') {
        registerServiceWorker();
      }
    });
  };

  const registerServiceWorker = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('Service Worker registered');
        })
        .catch(err => {
          console.log('Service Worker registration failed:', err);
        });
    }
  };

  // Function to show notification
  const showNotification = (title, options) => {
    if (notificationPermission === 'granted') {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(registration => {
          registration.showNotification(title, options);
        });
      } else {
        new Notification(title, options);
      }
    }
  };

  useEffect(() => {
    const auth = getAuth();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate("/");
        return;
      }

      // Check for authorized email
      if (user.email !== "kerala.adm@srishanmugha.com") {
        setUnauthorized(true);
        setLoading(false);
        return;
      }

      setUser(user);

      try {
        const userSnapshot = await getDocs(
          query(collection(db, "users"), where("uid", "==", user.uid))
        );

        if (!userSnapshot.empty) {
          const userData = userSnapshot.docs[0].data();
          setUserName(userData.fullName);
        }

        // Set up real-time listener for students
        const studentsQuery = collection(db, "shanmugha");
        const unsubscribeStudents = onSnapshot(studentsQuery, (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
              showNotification("New Student Added", {
                body: `${change.doc.data().candidateName} added to ${change.doc.data().course}`,
                icon: "/icon.png"
              });
            } else if (change.type === "modified") {
              showNotification("Student Updated", {
                body: `${change.doc.data().candidateName}'s details were updated`,
                icon: "/icon.png"
              });
            }
          });

          const studentList = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          // Sort by newest first
          const sortedStudents = studentList.sort((a, b) => {
            const aTime = a.createdAt?.seconds || 0;
            const bTime = b.createdAt?.seconds || 0;
            return bTime - aTime;
          });

          setStudents(sortedStudents);
        });

        return () => {
          unsubscribe();
          unsubscribeStudents();
        };
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load student data.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [navigate, notificationPermission]);

  const confirmedCount = students.filter((s) => s.applicationStatus === "Enroll").length;
  const enquiryCount = students.filter((s) => s.applicationStatus === "Enquiry").length;

  const indexOfLastStudent = currentPage * studentsPerPage;
  const indexOfFirstStudent = indexOfLastStudent - studentsPerPage;
  const currentStudents = students.slice(indexOfFirstStudent, indexOfLastStudent);

  const totalPages = Math.ceil(students.length / studentsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (unauthorized) {
    return <Unauthorized />;
  }

  return (
    <div className="dashboard-container">
      {/* Main Content */}
      <main className="main-content">
        <header className="dashboard-header">
          <div className="header-content">
            <div className="header-center">
              <h1>Welcome back, {userName || user?.email}</h1>
              <p className="welcome-message">Here's your dashboard overview</p>
            </div>

            <div className="profile-section desktop-only">
              <button
                className="notification-btn"
                onClick={() => setShowNotificationSettings(!showNotificationSettings)}
                title="Notification settings"
              >
                <FiBell size={20} />
                {notificationPermission === 'granted' && <span className="notification-dot"></span>}
              </button>

              {showNotificationSettings && (
                <div className="notification-settings-dropdown">
                  {notificationPermission === 'granted' ? (
                    <div className="notification-status">
                      <p>Notifications enabled</p>
                      <button 
                        className="disable-btn"
                        onClick={() => setNotificationPermission('denied')}
                      >
                        Disable
                      </button>
                    </div>
                  ) : (
                    <div className="notification-status">
                      <p>Notifications are {notificationPermission}</p>
                      <button 
                        className="enable-btn"
                        onClick={requestNotificationPermission}
                      >
                        Enable
                      </button>
                    </div>
                  )}
                </div>
              )}

              <button
                className="profile-btn"
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                aria-expanded={showProfileDropdown}
              >
                <div className="profile-icon">
                  <FiUser size={20} />
                </div>
              </button>

              {showProfileDropdown && (
                <div className="profile-dropdown">
                  <div className="dropdown-item user-info">
                    <FiUser size={16} />
                    <span>{user?.email}</span>
                  </div>
                  <button
                    className="dropdown-item logout-item"
                    onClick={() => setShowLogoutConfirm(true)}
                  >
                    <FiLogOut size={16} />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <section className="stats-cards">
          <div className="stats-card total-students">
            <div className="card-content">
              <h3>Total Students</h3>
              <p>{students.length}</p>
            </div>
            <div className="card-icon">
              <FiUser />
            </div>
          </div>
          <div className="stats-card enrolled">
            <div className="card-content">
              <h3>Enrolled</h3>
              <p>{confirmedCount}</p>
            </div>
            <div className="card-icon">
              <FiBook />
            </div>
          </div>
          <div className="stats-card enquiries">
            <div className="card-content">
              <h3>Enquiries</h3>
              <p>{enquiryCount}</p>
            </div>
            <div className="card-icon">
              <FiClock />
            </div>
          </div>
        </section>

        <section className="recent-students">
          <div className="section-header">
            <h2>Recently Added Students</h2>
            {students.length > 0 && (
              <p className="showing-text">
                Showing {indexOfFirstStudent + 1}-{Math.min(indexOfLastStudent, students.length)} of {students.length}
              </p>
            )}
          </div>

          {error && <div className="error-message">{error}</div>}
          {!error && students.length === 0 && (
            <div className="empty-state">
              <p>No students found. Add your first student to get started!</p>
            </div>
          )}

          {students.length > 0 && (
            <>
              <div className="table-container">
                <table className="students-table">
                  <thead>
                    <tr>
                      <th>No.</th>
                      <th>Name</th>
                      <th>Course</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentStudents.map((s, index) => (
                      <tr key={s.studentId}>
                        <td>{indexOfFirstStudent + index + 1}</td>
                        <td>{s.candidateName}</td>
                        <td>{s.course}</td>
                        <td>
                          <span className={`status-badge ${s.applicationStatus.toLowerCase()}`}>
                            {s.applicationStatus}
                          </span>
                        </td>
                        <td>
                          <button
                            className="view-btn"
                            onClick={() => {
                              setSelectedStudent(s);
                              setShowDetailsModal(true);
                            }}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="pagination-controls">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="pagination-btn"
                  >
                    <FiChevronLeft /> Previous
                  </button>

                  <div className="page-numbers">
                    {[...Array(totalPages)].map((_, i) => (
                      <button
                        key={i + 1}
                        className={`page-btn ${currentPage === i + 1 ? "active" : ""}`}
                        onClick={() => handlePageChange(i + 1)}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="pagination-btn"
                  >
                    Next <FiChevronRight />
                  </button>
                </div>
              )}
            </>
          )}

          <div className="mobile-message">
            <p>Please use a larger screen to view the student table.</p>
          </div>
        </section>

        {/* Logout Confirmation Modal */}
        {showLogoutConfirm && (
          <div className="logout-modal-overlay">
            <div className="logout-modal">
              <h3>Confirm Logout</h3>
              <p>Are you sure you want to logout?</p>
              <div className="modal-actions">
                <button
                  className="cancel-btn"
                  onClick={() => setShowLogoutConfirm(false)}
                >
                  Cancel
                </button>
                <button
                  className="confirm-btn"
                  onClick={handleLogout}
                >
                  Yes, Logout
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Student Details Modal */}
      {showDetailsModal && selectedStudent && (
        <div className="student-modal-overlay">
          <div className="student-modal">
            <button
              className="close-modal-btn"
              onClick={() => setShowDetailsModal(false)}
            >
              &times;
            </button>

            <div className="modal-header">
              <h3>Student Details</h3>
              <span className={`status-badge ${selectedStudent.applicationStatus.toLowerCase()}`}>
                {selectedStudent.applicationStatus}
              </span>
            </div>

            <div className="modal-body">
              <div className="detail-card">
                <h4>Basic Information</h4>
                <div className="detail-row">
                  <span className="detail-label">Name:</span>
                  <span className="detail-value">{selectedStudent.candidateName}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Course:</span>
                  <span className="detail-value">{selectedStudent.course}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">College:</span>
                  <span className="detail-value">{selectedStudent.college || 'N/A'}</span>
                </div>
              </div>

              <div className="detail-card">
                <h4>Contact Information</h4>
                <div className="detail-row">
                  <span className="detail-label">Father Name:</span>
                  <span className="detail-value">{selectedStudent.fatherName || 'N/A'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Parent Number:</span>
                  <span className="detail-value">{selectedStudent.parentNumber || 'N/A'}</span>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="modal-close-btn"
                onClick={() => setShowDetailsModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {sidebarOpen && (
        <div className="overlay" onClick={toggleSidebar}></div>
      )}
    </div>
  );
};

export default Dashboard;