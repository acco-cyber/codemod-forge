import React from 'react';
import PropTypes from 'prop-types';

// Demo 3: Component with propTypes + defaultProps.
function Alert({ message, severity, dismissible }) {
  return (
    <div className={`alert alert-${severity}`} role="alert">
      <span>{message}</span>
      {dismissible && <button className="alert-close">x</button>}
    </div>
  );
}

Alert.propTypes = {
  message: PropTypes.string.isRequired,
  severity: PropTypes.oneOf(['info', 'warning', 'error', 'success']).isRequired,
  dismissible: PropTypes.bool,
};

Alert.defaultProps = {
  severity: 'info',
  dismissible: false,
};

export default Alert;
