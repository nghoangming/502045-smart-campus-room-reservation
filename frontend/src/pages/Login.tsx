
import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Login() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError("");

        if (!username.trim() || !password) {
            setError("Please enter both username and password.");
            return;
        }

        setLoading(true);

        if (username.trim() === "admin" && password === "admin123") {
            localStorage.setItem("smartCampusLoggedIn", "true");
            localStorage.setItem("smartCampusUsername", username.trim());
            navigate("/dashboard", { replace: true });
        } else {
            setError("Incorrect username or password. Please try again.");
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-decoration login-decoration-one"></div>
            <div className="login-decoration login-decoration-two"></div>

            <div className="login-layout">
                <section className="login-intro">
                    <div className="brand-lockup">
                        <div className="brand-mark">
                            <span>SC</span>
                        </div>
                        <div>
                            <div className="brand-name">SMART CAMPUS</div>
                            <div className="brand-caption">
                                FACILITY MANAGEMENT
                            </div>
                        </div>
                    </div>

                    <div className="intro-copy">
                        <div className="intro-label">
                            <span></span>
                            SMART CAMPUS PORTAL
                        </div>

                        <h1>
                            Manage your campus.
                            <br />
                            <span>Smarter.</span>
                        </h1>

                        <p>
                            A simpler way to manage facilities, check room
                            availability, and keep your campus running smoothly.
                        </p>
                    </div>

                    <div className="intro-footer">
                        <span className="footer-dot"></span>
                        One campus. One connected experience.
                    </div>
                </section>

                <section className="login-card-wrap">
                    <form className="login-card" onSubmit={handleLogin}>
                        <div className="mobile-brand">
                            <div className="brand-mark">
                                <span>SC</span>
                            </div>
                            <strong>SMART CAMPUS</strong>
                        </div>

                        <div className="welcome-icon">
                            <svg viewBox="0 0 24 24" fill="none">
                                <path
                                    d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                />
                                <path
                                    d="M4.5 20a7.5 7.5 0 0 1 15 0"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    strokeLinecap="round"
                                />
                            </svg>
                        </div>

                        <div className="card-eyebrow">WELCOME BACK</div>
                        <h2>Sign in to your account</h2>

                        <p className="card-description">
                            Enter your details to access the campus dashboard.
                        </p>

                        {error && (
                            <div className="login-error" role="alert">
                                <span>!</span>
                                {error}
                            </div>
                        )}

                        <label className="field-label" htmlFor="username">
                            Username
                        </label>

                        <div className="login-input-wrap">
                            <input
                                id="username"
                                type="text"
                                autoComplete="username"
                                placeholder="Enter your username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                            />
                        </div>

                        <label className="field-label" htmlFor="password">
                            Password
                        </label>

                        <div className="login-input-wrap">
                            <input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                autoComplete="current-password"
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />

                            <button
                                className="show-password"
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? "Hide" : "Show"}
                            </button>
                        </div>

                        <button
                            className="login-submit"
                            type="submit"
                            disabled={loading}
                        >
                            {loading ? "Signing in..." : "Sign in"}
                            <span>→</span>
                        </button>

                        <div className="secure-note">
                            Your session is protected
                        </div>

                        <div className="demo-credentials">
                            <strong>Demo account</strong>
                            <span>
                                Username: <b>admin</b>
                            </span>
                            <span>
                                Password: <b>admin123</b>
                            </span>
                        </div>
                    </form>

                    <div className="login-copyright">
                        © 2026 Smart Campus Facility &amp; Study Room
                    </div>
                </section>
            </div>

            <style>{`
                * {
                    box-sizing: border-box;
                }

                .login-page {
                    min-height: 100vh;
                    position: relative;
                    overflow: hidden;
                    background: #f4f7fc;
                    color: #17233c;
                    font-family: Inter, Arial, sans-serif;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 42px 28px;
                }

                .login-decoration {
                    position: absolute;
                    border-radius: 50%;
                    pointer-events: none;
                }

                .login-decoration-one {
                    width: 520px;
                    height: 520px;
                    background: rgba(57, 112, 240, 0.06);
                    top: -270px;
                    right: -100px;
                }

                .login-decoration-two {
                    width: 420px;
                    height: 420px;
                    border: 1px solid rgba(57, 112, 240, 0.12);
                    bottom: -250px;
                    left: -100px;
                }

                .login-layout {
                    position: relative;
                    z-index: 1;
                    width: 100%;
                    max-width: 1100px;
                    min-height: 650px;
                    display: grid;
                    grid-template-columns: 1fr 0.88fr;
                    align-items: center;
                    gap: 64px;
                }

                .login-intro {
                    min-height: 570px;
                    padding: 28px 0;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                }

                .brand-lockup {
                    display: flex;
                    align-items: center;
                    gap: 13px;
                }

                .brand-mark {
                    width: 48px;
                    height: 48px;
                    display: grid;
                    place-items: center;
                    border-radius: 14px;
                    background: linear-gradient(145deg, #3976f6, #2055d5);
                    color: white;
                    box-shadow: 0 8px 20px rgba(37, 99, 235, 0.22);
                    font-weight: 800;
                    font-size: 17px;
                }

                .brand-name {
                    font-size: 14px;
                    font-weight: 800;
                    letter-spacing: 1.5px;
                }

                .brand-caption {
                    margin-top: 4px;
                    font-size: 10px;
                    letter-spacing: 1.8px;
                    color: #7b8aa6;
                    font-weight: 700;
                }

                .intro-copy {
                    margin-top: 30px;
                }

                .intro-label {
                    display: inline-flex;
                    align-items: center;
                    gap: 9px;
                    border: 1px solid #dce6fb;
                    background: white;
                    color: #3569d9;
                    border-radius: 30px;
                    padding: 9px 13px;
                    font-size: 10px;
                    letter-spacing: 1.3px;
                    font-weight: 800;
                }

                .intro-label span,
                .footer-dot {
                    width: 7px;
                    height: 7px;
                    border-radius: 50%;
                    background: #3d77f6;
                    display: inline-block;
                }

                .intro-copy h1 {
                    font-size: clamp(40px, 4.5vw, 59px);
                    letter-spacing: -2.5px;
                    line-height: 1.12;
                    margin: 27px 0 20px;
                    font-weight: 800;
                    color: #17233c;
                }

                .intro-copy h1 span {
                    color: #3973ee;
                }

                .intro-copy p {
                    max-width: 440px;
                    color: #72809a;
                    line-height: 1.85;
                    font-size: 15px;
                }

                .intro-footer {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    color: #8793a9;
                    font-size: 12px;
                }

                .footer-dot {
                    width: 8px;
                    height: 8px;
                }

                .login-card-wrap {
                    width: 100%;
                    max-width: 430px;
                    justify-self: end;
                }

                .login-card {
                    background: white;
                    border: 1px solid #e9edf5;
                    border-radius: 22px;
                    padding: 39px 38px 28px;
                    box-shadow: 0 24px 70px rgba(28, 48, 88, 0.09);
                }

                .mobile-brand {
                    display: none;
                }

                .welcome-icon {
                    width: 48px;
                    height: 48px;
                    border-radius: 15px;
                    background: #edf3ff;
                    color: #3470ef;
                    display: grid;
                    place-items: center;
                    margin-bottom: 24px;
                }

                .welcome-icon svg {
                    width: 25px;
                    height: 25px;
                }

                .card-eyebrow {
                    font-size: 10px;
                    font-weight: 800;
                    letter-spacing: 1.8px;
                    color: #3973ee;
                    margin-bottom: 9px;
                }

                .login-card h2 {
                    font-size: 25px;
                    letter-spacing: -0.7px;
                    margin: 0;
                    color: #192641;
                }

                .card-description {
                    font-size: 13px;
                    color: #8994a8;
                    line-height: 1.6;
                    margin: 10px 0 27px;
                }

                .field-label {
                    display: block;
                    color: #34415a;
                    font-size: 12px;
                    font-weight: 700;
                    margin-bottom: 9px;
                }

                .login-input-wrap {
                    height: 48px;
                    display: flex;
                    align-items: center;
                    gap: 11px;
                    padding: 0 13px;
                    border: 1px solid #e1e7f0;
                    border-radius: 10px;
                    background: #fbfcfe;
                    margin-bottom: 20px;
                }

                .login-input-wrap:focus-within {
                    border-color: #5c8df5;
                    box-shadow: 0 0 0 3px rgba(57, 115, 238, 0.1);
                    background: white;
                }

                .login-input-wrap input {
                    width: 100%;
                    min-width: 0;
                    border: 0;
                    outline: 0;
                    background: transparent;
                    color: #26334c;
                    font: inherit;
                    font-size: 13px;
                }

                .login-input-wrap input::placeholder {
                    color: #a6afbf;
                }

                .show-password {
                    border: 0;
                    background: transparent;
                    color: #6e7e99;
                    font-size: 11px;
                    font-weight: 700;
                    cursor: pointer;
                }

                .login-submit {
                    width: 100%;
                    height: 49px;
                    border: 0;
                    border-radius: 10px;
                    background: linear-gradient(100deg, #3978f5, #285edc);
                    color: white;
                    font-size: 14px;
                    font-weight: 700;
                    cursor: pointer;
                    margin-top: 5px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                    box-shadow: 0 8px 17px rgba(48, 103, 229, 0.22);
                }

                .login-submit:hover {
                    filter: brightness(1.05);
                }

                .login-submit:disabled {
                    opacity: 0.7;
                    cursor: wait;
                }

                .login-submit span {
                    font-size: 19px;
                    font-weight: 400;
                }

                .login-error {
                    display: flex;
                    align-items: center;
                    gap: 9px;
                    padding: 11px 12px;
                    background: #fff1f1;
                    color: #c33c45;
                    border: 1px solid #ffdada;
                    border-radius: 9px;
                    font-size: 12px;
                    line-height: 1.5;
                    margin: -10px 0 18px;
                }

                .login-error span {
                    width: 17px;
                    height: 17px;
                    display: grid;
                    place-items: center;
                    border-radius: 50%;
                    background: #e45860;
                    color: white;
                    font-weight: 800;
                }

                .secure-note {
                    text-align: center;
                    color: #98a3b5;
                    font-size: 11px;
                    margin-top: 21px;
                }

                .demo-credentials {
                    margin-top: 22px;
                    padding: 12px 14px;
                    border-radius: 9px;
                    background: #f6f8fc;
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 6px;
                    font-size: 11px;
                    color: #7c889d;
                }

                .demo-credentials strong {
                    grid-column: 1 / -1;
                    color: #4c5a73;
                    margin-bottom: 2px;
                }

                .demo-credentials b {
                    color: #394965;
                }

                .login-copyright {
                    text-align: center;
                    color: #a0aabd;
                    font-size: 10px;
                    margin-top: 22px;
                }

                @media (max-width: 800px) {
                    .login-page {
                        padding: 24px 16px;
                    }

                    .login-layout {
                        max-width: 450px;
                        min-height: auto;
                        display: block;
                    }

                    .login-intro {
                        display: none;
                    }

                    .login-card-wrap {
                        max-width: 430px;
                        margin: 0 auto;
                    }

                    .login-card {
                        padding: 30px 26px 24px;
                        border-radius: 18px;
                    }

                    .mobile-brand {
                        display: flex;
                        align-items: center;
                        gap: 11px;
                        font-size: 12px;
                        letter-spacing: 1px;
                        margin-bottom: 30px;
                    }

                    .mobile-brand .brand-mark {
                        width: 40px;
                        height: 40px;
                    }
                }

                @media (max-width: 380px) {
                    .login-card {
                        padding: 25px 19px 22px;
                    }

                    .login-card h2 {
                        font-size: 22px;
                    }

                    .demo-credentials {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
        </div>
    );
}

export default Login;
