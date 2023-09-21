import React from "react";
import { AuthProvider } from "../contexts/AuthContext";
import {
    BrowserRouter as Router,
    Switch,
    Route,
    Redirect,
} from "react-router-dom";
import Dashboard from "./Dashboard";
import Display from "./Display";

import Signup from "./authentication/Signup";
import Login from "./authentication/Login";
import PrivateRoute from "./authentication/PrivateRoute";
import ForgotPassword from "./authentication/ForgotPassword";
import UserProfile from "./authentication/UserProfile";

const App = () => {
    return (
        <div className="App">
            <Router>
                <AuthProvider>
                    <Switch>
                        <PrivateRoute exact path="/display">
                            <Display />
                        </PrivateRoute>
                        <Redirect exact from="/" to="/dashboard" />
                        {/* for future reference, nested routing won't work if the dashboard URL is /, that's why I changed it to dashboard */}
                        <PrivateRoute path="/dashboard">
                            <Dashboard />
                        </PrivateRoute>
                        <PrivateRoute path="/user">
                            <UserProfile />
                        </PrivateRoute>
                        <Route path="/signup" component={Signup} />
                        <Route path="/login" component={Login} />
                        <Route
                            path="/forgot-password"
                            component={ForgotPassword}
                        />
                    </Switch>
                </AuthProvider>
            </Router>
        </div>
    );
};

export default App;
