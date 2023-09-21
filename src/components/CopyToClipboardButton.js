import React, { useState } from "react";
import { Button } from "react-bootstrap";

// reference: https://blog.logrocket.com/implementing-copy-to-clipboard-in-react-with-clipboard-api/
export default function CopyToClipboardButton({
    textToBeCopied,
    defaultText,
    onSuccessText,
    ...props
}) {
    const [isCopied, setIsCopied] = useState(false);

    // https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText
    async function copyTextToClipboard(text) {
        return await navigator.clipboard.writeText(text);
    }

    // onClick handler function for the copy button
    const handleCopyClick = () => {
        // Asynchronously call copyTextToClipboard
        copyTextToClipboard(textToBeCopied)
            .then(() => {
                // If successful, update the isCopied state value
                setIsCopied(true);
                setTimeout(() => {
                    setIsCopied(false);
                }, 1500);
            })
            .catch((err) => {
                console.log(err);
            });
    };
    return (
        <Button
            onClick={handleCopyClick}
            variant={isCopied ? "success" : "primary"}
            {...props}
        >
            <span>{isCopied ? onSuccessText : defaultText}</span>
        </Button>
    );
}
