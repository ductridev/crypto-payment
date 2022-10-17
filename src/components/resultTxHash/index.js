import Modal from 'react-modal';
import Button from 'react-bootstrap/Button';

export default function ResultModal(props) {
    const customStyles = {
        content: {
          top: '50%',
          left: '50%',
          right: 'auto',
          bottom: 'auto',
          marginRight: '-50%',
          transform: 'translate(-50%, -50%)',
        },
      };

    return (
        <>
            <Modal show={props.showResultModal} onHide={props.onClose} appElement={document.getElementById('main')} style={customStyles} shouldCloseOnOverlayClick={false}>
                <h3>Modal heading</h3>
                <div>
                    Your transaction hash: <a href={"https://goerli.etherscan.io/tx/" + props.resultTxHash} target={"_blank"} rel="noreferrer">{props.resultTxHash}</a>
                </div>
                <div>
                    <Button variant="secondary" onClick={props.onClose}>
                        Close
                    </Button>
                </div>
            </Modal>
        </>
    )
}