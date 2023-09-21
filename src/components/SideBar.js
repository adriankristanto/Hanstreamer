import React, { useState, useEffect } from "react";
import { Navbar, Offcanvas, Form, Modal, Button } from "react-bootstrap";
import { database } from "../firebase";
import { useAuth } from "../contexts/AuthContext";

export const defaultSettings = {
    selfieSegmentationEnabled: false,
    zoomEnabled: true,
    moveVisToBackgroundOrForegroundEnabled: true,
    highlightEnabled: true,
    panEnabled: true,
    clickDragEnabled: true,
    swipeEnabled: true,
    drawHandLandmarks: false,
    showSwipingDistance: false,
    swipingSensitivity: 2,
    openHandAccuracy: 9,
    fistAccuracy: 7.5,
    pointingAccuracy: 7.5,
    okAccuracy: 8,
    penSize: 5,
    eraserSize: 60,
};

export default function SideBar() {
    const [settings, setSettings] = useState(defaultSettings);
    const [open, setOpen] = useState(false);
    const { currentUser } = useAuth();

    // when the currentUser changes, change the settings too
    useEffect(() => {
        const cleanup = database.settings
            .where("userId", "==", currentUser.uid)
            .onSnapshot((snapshot) => {
                const data = snapshot.docs.map(database.formatDoc);
                data.forEach((settings) => {
                    // we don't want to update the userId or createdAt
                    delete settings.userId;
                    delete settings.createdAt;
                    setSettings(settings);
                });
            });
        return cleanup;
    }, [currentUser]);

    function openModal() {
        setOpen(true);
    }

    function closeModal() {
        setOpen(false);
    }

    function onEnable() {
        updateSettings(() => {
            return { selfieSegmentationEnabled: true };
        });
        closeModal();
    }

    function onSelfieSegmentationSettingChange() {
        // if  the selfie segmentation was disabled, show the warning
        if (!settings.selfieSegmentationEnabled) {
            openModal();
        }
        // else, simply turn off selfie segmentation without showing the warning
        else {
            updateSettings(() => {
                return { selfieSegmentationEnabled: false };
            });
        }
    }

    function updateSettings(newSettingsGenerator) {
        setSettings((prevSettings) => {
            const settings = {
                ...prevSettings,
                ...newSettingsGenerator(prevSettings),
            };
            updateSettingsOnDatabase(settings);
            return settings;
        });
    }

    function updateSettingsOnDatabase(newSettings) {
        // check whether the settings have been created for the current user
        database.settings
            .where("userId", "==", currentUser.uid)
            .get()
            .then((existingSettings) => {
                const currentUserSettings = existingSettings.docs[0];
                // if the settings of the current user exist, update the settings
                if (currentUserSettings) {
                    currentUserSettings.ref.update(newSettings);
                }
                // otherwise, create a new entry
                else {
                    database.settings.add({
                        ...newSettings,
                        createdAt: database.getCurrentTimestamp(),
                        userId: currentUser.uid,
                    });
                }
            });
    }

    return (
        <div>
            <Navbar.Offcanvas
                id="offcanvasNavbar"
                aria-labelledby="offcanvasNavbarLabel"
                placement="end"
            >
                <Offcanvas.Header closeButton>
                    <Offcanvas.Title id="offcanvasNavbarLabel">
                        Settings
                    </Offcanvas.Title>
                </Offcanvas.Header>
                <Offcanvas.Body>
                    <Form className="py-2">
                        <Form.Group className="mb-3">
                            <h4 className="py-2">Experimental Features</h4>

                            <Form.Check
                                type="switch"
                                label="Enable Selfie Segmentation"
                                onChange={onSelfieSegmentationSettingChange}
                                checked={settings.selfieSegmentationEnabled}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <h4 className="py-2">Gestures</h4>

                            <Form.Check
                                type="switch"
                                label="Enable Zoom Gesture"
                                onChange={() =>
                                    updateSettings((prevSettings) => {
                                        return {
                                            zoomEnabled:
                                                !prevSettings.zoomEnabled,
                                        };
                                    })
                                }
                                checked={settings.zoomEnabled}
                            />
                            <Form.Check
                                type="switch"
                                label="Enable Gesture for Moving Visualisation to Background or Foreground"
                                onChange={() =>
                                    updateSettings((prevSettings) => {
                                        return {
                                            moveVisToBackgroundOrForegroundEnabled:
                                                !prevSettings.moveVisToBackgroundOrForegroundEnabled,
                                        };
                                    })
                                }
                                checked={
                                    settings.moveVisToBackgroundOrForegroundEnabled
                                }
                            />
                            <Form.Check
                                type="switch"
                                label="Enable Highlight Gesture"
                                onChange={() =>
                                    updateSettings((prevSettings) => {
                                        return {
                                            highlightEnabled:
                                                !prevSettings.highlightEnabled,
                                        };
                                    })
                                }
                                checked={settings.highlightEnabled}
                            />
                            <Form.Check
                                type="switch"
                                label="Enable Pan Gesture"
                                onChange={() =>
                                    updateSettings((prevSettings) => {
                                        return {
                                            panEnabled:
                                                !prevSettings.panEnabled,
                                        };
                                    })
                                }
                                checked={settings.panEnabled}
                            />
                            <Form.Check
                                type="switch"
                                label="Enable Click and Drag Gesture"
                                onChange={() =>
                                    updateSettings((prevSettings) => {
                                        return {
                                            clickDragEnabled:
                                                !prevSettings.clickDragEnabled,
                                        };
                                    })
                                }
                                checked={settings.clickDragEnabled}
                            />
                            <Form.Check
                                type="switch"
                                label="Enable Swipe Gesture"
                                onChange={() =>
                                    updateSettings((prevSettings) => {
                                        return {
                                            swipeEnabled:
                                                !prevSettings.swipeEnabled,
                                        };
                                    })
                                }
                                checked={settings.swipeEnabled}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <h4 className="py-2">Annotation</h4>
                            <Form.Label>
                                <div className="d-flex">
                                    <div className="me-auto">Pen Size</div>
                                    <div>{settings.penSize}</div>
                                </div>
                                <div style={{ color: "grey" }}>
                                    The higher the value, the bigger the
                                    annotation pen size will be.{" "}
                                    <strong>
                                        Default: {defaultSettings.penSize}
                                    </strong>
                                </div>
                            </Form.Label>
                            <Form.Range
                                onChange={(e) =>
                                    setSettings((prevSettings) => {
                                        return {
                                            ...prevSettings,
                                            penSize: +e.target.value,
                                        };
                                    })
                                }
                                onMouseUp={(e) => {
                                    updateSettings(() => {
                                        return {
                                            penSize: +e.target.value,
                                        };
                                    });
                                }}
                                value={settings.penSize}
                                min={5}
                                max={20}
                                step={5}
                            />
                            <Form.Label>
                                <div className="d-flex">
                                    <div className="me-auto">Eraser Size</div>
                                    <div>{settings.eraserSize}</div>
                                </div>
                                <div style={{ color: "grey" }}>
                                    The higher the value, the bigger the
                                    annotation eraser size will be.{" "}
                                    <strong>
                                        Default: {defaultSettings.eraserSize}
                                    </strong>
                                </div>
                            </Form.Label>
                            <Form.Range
                                onChange={(e) =>
                                    setSettings((prevSettings) => {
                                        return {
                                            ...prevSettings,
                                            eraserSize: +e.target.value,
                                        };
                                    })
                                }
                                onMouseUp={(e) => {
                                    updateSettings(() => {
                                        return {
                                            eraserSize: +e.target.value,
                                        };
                                    });
                                }}
                                value={settings.eraserSize}
                                min={10}
                                max={100}
                                step={10}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <h4 className="py-2">Developer Options</h4>

                            <Form.Check
                                type="switch"
                                label="Draw Hand Landmarks and Connectors"
                                onChange={() => {
                                    updateSettings((prevSettings) => {
                                        return {
                                            drawHandLandmarks:
                                                !prevSettings.drawHandLandmarks,
                                        };
                                    });
                                }}
                                checked={settings.drawHandLandmarks}
                            />
                            <Form.Check
                                type="switch"
                                label="Show Swiping Gesture Prediction and Distance on Console"
                                onChange={() => {
                                    updateSettings((prevSettings) => {
                                        return {
                                            showSwipingDistance:
                                                !prevSettings.showSwipingDistance,
                                        };
                                    });
                                }}
                                checked={settings.showSwipingDistance}
                            />
                            <Form.Label>
                                <div className="d-flex">
                                    <div className="me-auto">
                                        Swiping Gesture Sensitivity
                                    </div>
                                    <div>{settings.swipingSensitivity}</div>
                                </div>
                                <div style={{ color: "grey" }}>
                                    The higher the value, the more sensitive the
                                    application will be in detecting swiping
                                    gestures.{" "}
                                    <strong>
                                        Default:{" "}
                                        {defaultSettings.swipingSensitivity}
                                    </strong>
                                </div>
                            </Form.Label>
                            <Form.Range
                                onChange={(e) =>
                                    setSettings((prevSettings) => {
                                        return {
                                            ...prevSettings,
                                            swipingSensitivity: +e.target.value,
                                        };
                                    })
                                }
                                onMouseUp={(e) => {
                                    updateSettings(() => {
                                        return {
                                            swipingSensitivity: +e.target.value,
                                        };
                                    });
                                }}
                                value={settings.swipingSensitivity}
                                min={1}
                                max={10}
                                step={0.25}
                            />
                            <Form.Label>
                                <div className="d-flex">
                                    <div className="me-auto">
                                        Open Hand Minimum Accuracy
                                    </div>
                                    <div>{settings.openHandAccuracy}</div>
                                </div>
                                <div style={{ color: "grey" }}>
                                    The higher the value, the less likely the
                                    application will detect an open hand. Used
                                    for zooming and determining whether to
                                    execute swiping detection.{" "}
                                    <strong>
                                        Default:{" "}
                                        {defaultSettings.openHandAccuracy}
                                    </strong>
                                </div>
                            </Form.Label>
                            <Form.Range
                                onChange={(e) =>
                                    setSettings((prevSettings) => {
                                        return {
                                            ...prevSettings,
                                            openHandAccuracy: +e.target.value,
                                        };
                                    })
                                }
                                onMouseUp={(e) => {
                                    updateSettings(() => {
                                        return {
                                            openHandAccuracy: +e.target.value,
                                        };
                                    });
                                }}
                                value={settings.openHandAccuracy}
                                min={1}
                                max={10}
                                step={0.25}
                            />
                            <Form.Label>
                                <div className="d-flex">
                                    <div className="me-auto">
                                        Fist Minimum Accuracy
                                    </div>
                                    <div>{settings.fistAccuracy}</div>
                                </div>
                                <div style={{ color: "grey" }}>
                                    The higher the value, the less likely the
                                    application will detect a fist. Used for
                                    panning and moving the visualisation to
                                    background or foreground.{" "}
                                    <strong>
                                        Default: {defaultSettings.fistAccuracy}
                                    </strong>
                                </div>
                            </Form.Label>
                            <Form.Range
                                onChange={(e) =>
                                    setSettings((prevSettings) => {
                                        return {
                                            ...prevSettings,
                                            fistAccuracy: +e.target.value,
                                        };
                                    })
                                }
                                onMouseUp={(e) => {
                                    updateSettings(() => {
                                        return {
                                            fistAccuracy: +e.target.value,
                                        };
                                    });
                                }}
                                value={settings.fistAccuracy}
                                min={1}
                                max={10}
                                step={0.25}
                            />
                            <Form.Label>
                                <div className="d-flex">
                                    <div className="me-auto">
                                        Pointing Minimum Accuracy
                                    </div>
                                    <div>{settings.pointingAccuracy}</div>
                                </div>
                                <div style={{ color: "grey" }}>
                                    The higher the value, the less likely the
                                    application will detect a pointing hand
                                    gesture. Used for highlighting.{" "}
                                    <strong>
                                        Default:{" "}
                                        {defaultSettings.pointingAccuracy}
                                    </strong>
                                </div>
                            </Form.Label>
                            <Form.Range
                                onChange={(e) =>
                                    setSettings((prevSettings) => {
                                        return {
                                            ...prevSettings,
                                            pointingAccuracy: +e.target.value,
                                        };
                                    })
                                }
                                onMouseUp={(e) => {
                                    updateSettings(() => {
                                        return {
                                            pointingAccuracy: +e.target.value,
                                        };
                                    });
                                }}
                                value={settings.pointingAccuracy}
                                min={1}
                                max={10}
                                step={0.25}
                            />
                            <Form.Label>
                                <div className="d-flex">
                                    <div className="me-auto">
                                        OK Sign Minimum Accuracy
                                    </div>
                                    <div>{settings.okAccuracy}</div>
                                </div>
                                <div style={{ color: "grey" }}>
                                    The higher the value, the less likely the
                                    application will detect an OK sign hand
                                    gesture. Used for clicking and dragging.{" "}
                                    <strong>
                                        Default: {defaultSettings.okAccuracy}
                                    </strong>
                                </div>
                            </Form.Label>
                            <Form.Range
                                onChange={(e) =>
                                    setSettings((prevSettings) => {
                                        return {
                                            ...prevSettings,
                                            okAccuracy: +e.target.value,
                                        };
                                    })
                                }
                                onMouseUp={(e) => {
                                    updateSettings(() => {
                                        return {
                                            okAccuracy: +e.target.value,
                                        };
                                    });
                                }}
                                value={settings.okAccuracy}
                                min={1}
                                max={10}
                                step={0.25}
                            />
                        </Form.Group>
                    </Form>
                </Offcanvas.Body>
            </Navbar.Offcanvas>

            <Modal show={open} onHide={closeModal} centered variant="warning">
                <Modal.Body>
                    <div className="py-3">
                        Enabling selfie segmentation might result in worse
                        performance & the application may crash.
                    </div>
                    Enable anyway?
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="danger" onClick={onEnable}>
                        Yes
                    </Button>
                    <Button variant="secondary" onClick={closeModal}>
                        No
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
}
