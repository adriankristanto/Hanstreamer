// Reference: https://www.youtube.com/watch?v=6XTRElVAZ9Y
import React, { useState } from "react";
import ReactDOM from "react-dom";
import {
    Button,
    Modal,
    Form,
    Alert,
    Toast,
    ProgressBar,
} from "react-bootstrap";
import { database, storage } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { v4 as uuidV4 } from "uuid";
import { VISUALISATIONS } from "./visualisation/types";

export default function UploadFileButton({ ...props }) {
    const [open, setOpen] = useState(false);
    const [file, setFile] = useState(null);
    const [radio, setRadio] = useState(VISUALISATIONS.BAR_CHART.ID);
    const [error, setError] = useState("");
    const [uploadingFiles, setUploadingFiles] = useState([]);
    const { currentUser } = useAuth();

    function openModal() {
        setOpen(true);
    }

    function closeModal() {
        setFile(null);
        setRadio(VISUALISATIONS.BAR_CHART.ID);
        setError("");
        setOpen(false);
    }

    function handleUpload(event) {
        event.preventDefault();
        if (file === null) return setError("Please choose a file!");
        closeModal();

        // the id of the file that we are currently uploading
        const id = uuidV4();
        setUploadingFiles((prevUploadingFiles) => {
            return [
                ...prevUploadingFiles,
                {
                    id: id,
                    name: file.name,
                    progress: 0,
                    error: false,
                },
            ];
        });

        const uploadTask = storage
            .ref(`/files/${currentUser.uid}/${file.name}`)
            .put(file);

        uploadTask.on(
            "state_changed",
            (snapshot) => {
                const progress =
                    snapshot.bytesTransferred / snapshot.totalBytes;
                setUploadingFiles((prevUploadingFiles) => {
                    return prevUploadingFiles.map((uploadFile) => {
                        if (uploadFile.id === id) {
                            return { ...uploadFile, progress: progress };
                        }

                        return uploadFile;
                    });
                });
            },
            () => {
                setUploadingFiles((prevUploadingFiles) => {
                    return prevUploadingFiles.map((uploadFile) => {
                        if (uploadFile.id === id) {
                            return { ...uploadFile, error: true };
                        }
                        return uploadFile;
                    });
                });
            },
            () => {
                // don't remove the toast immediately
                setTimeout(
                    () =>
                        setUploadingFiles((prevUploadingFiles) => {
                            return prevUploadingFiles.filter(
                                (uploadFile) => uploadFile.id !== id
                            );
                        }),
                    1500
                );
                uploadTask.snapshot.ref.getDownloadURL().then((url) => {
                    const data = {
                        url: url,
                        name: file.name,
                        userId: currentUser.uid,
                        visualisationType: radio,
                        createdAt: database.getCurrentTimestamp(),
                        ordering: 0,
                    };
                    database.files.add(data);
                });
            }
        );
    }

    function handleRadioChange(event) {
        // convert event.target.value to integer before updating the state
        setRadio(+event.target.value);
    }

    function handleFileChange(event) {
        setFile(event.target.files[0]);
    }

    return (
        <>
            <Button onClick={openModal} {...props}>
                Upload File
            </Button>
            <Modal show={open} onHide={closeModal} centered>
                {error && (
                    <Alert className="m-3" variant="danger">
                        {error}
                    </Alert>
                )}
                <Form onSubmit={handleUpload}>
                    <Modal.Body>
                        <Form.Group>
                            <Form.Control
                                type="file"
                                size="lg"
                                onChange={handleFileChange}
                            />
                        </Form.Group>
                        <Form.Group key="default-radio" className="mt-3">
                            Visualisation Type:
                            {Object.keys(VISUALISATIONS).map(
                                (visualisationType, index) => {
                                    return (
                                        <Form.Check
                                            label={
                                                VISUALISATIONS[
                                                    visualisationType
                                                ].NAME
                                            }
                                            value={
                                                VISUALISATIONS[
                                                    visualisationType
                                                ].ID
                                            }
                                            name="visualisationGroup"
                                            type="radio"
                                            key={`default-radio-${VISUALISATIONS[visualisationType].ID}`}
                                            onChange={handleRadioChange}
                                            defaultChecked={index === 0}
                                        />
                                    );
                                }
                            )}
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="success" type="submit">
                            Add File
                        </Button>
                        <Button variant="secondary" onClick={closeModal}>
                            Close
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
            {uploadingFiles &&
                ReactDOM.createPortal(
                    <div
                        style={{
                            position: "absolute",
                            bottom: "1rem",
                            right: "1rem",
                            maxWidth: "250px",
                        }}
                    >
                        {uploadingFiles.map((file) => (
                            <Toast
                                key={file.id}
                                // will only be relevant if there is an upload error
                                onClose={() =>
                                    setUploadingFiles((prevUploadingFiles) => {
                                        return prevUploadingFiles.filter(
                                            (uploadFile) =>
                                                uploadFile.id !== file.id
                                        );
                                    })
                                }
                            >
                                <Toast.Header
                                    className="text-truncate w-100 d-block"
                                    closeButton={file.error}
                                >
                                    {file.name}
                                </Toast.Header>
                                <Toast.Body>
                                    <ProgressBar
                                        animated={!file.error}
                                        variant={
                                            file.error ? "danger" : "primary"
                                        }
                                        now={
                                            file.error
                                                ? 100
                                                : file.progress * 100
                                        }
                                        label={
                                            file.error
                                                ? "Error"
                                                : `${Math.round(
                                                      file.progress * 100
                                                  )}%`
                                        }
                                    />
                                </Toast.Body>
                            </Toast>
                        ))}
                    </div>,
                    document.body
                )}
        </>
    );
}
