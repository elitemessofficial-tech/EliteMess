import React from 'react';
import { View, StyleSheet } from 'react-native';
import styled from 'styled-components';

interface LoaderProps {
  color?: string;
}

const Loader = ({ color = '#D4AF37' }: LoaderProps) => {
  return (
    <View style={styles.container}>
      <StyledWrapper $color={color}>
        <div className="loader">
          <div className="justify-content-center jimu-primary-loading" />
        </div>
      </StyledWrapper>
    </View>
  );
}

const StyledWrapper = styled.div<{ $color: string }>`
  position: relative;
  width: 60px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;

  .loader {
    position: absolute;
    width: 60px;
    height: 40px;
  }

  .jimu-primary-loading:before,
  .jimu-primary-loading:after {
    position: absolute;
    top: 0;
    content: '';
  }

  .jimu-primary-loading:before {
    left: -16px;
  }

  .jimu-primary-loading:after {
    left: 16px;
    -webkit-animation-delay: 0.32s !important;
    animation-delay: 0.32s !important;
  }

  .jimu-primary-loading:before,
  .jimu-primary-loading:after,
  .jimu-primary-loading {
    background: ${props => props.$color};
    -webkit-animation: loading-keys-app-loading 0.8s infinite ease-in-out;
    animation: loading-keys-app-loading 0.8s infinite ease-in-out;
    width: 10px;
    height: 24px;
  }

  .jimu-primary-loading {
    text-indent: -9999em;
    margin: auto;
    position: absolute;
    left: 25px;
    top: 8px;
    -webkit-animation-delay: 0.16s !important;
    animation-delay: 0.16s !important;
  }

  @-webkit-keyframes loading-keys-app-loading {
    0%, 80%, 100% {
      opacity: .75;
      box-shadow: 0 0 ${props => props.$color};
      height: 24px;
    }
    40% {
      opacity: 1;
      box-shadow: 0 -6px ${props => props.$color};
      height: 30px;
    }
  }

  @keyframes loading-keys-app-loading {
    0%, 80%, 100% {
      opacity: .75;
      box-shadow: 0 0 ${props => props.$color};
      height: 24px;
    }
    40% {
      opacity: 1;
      box-shadow: 0 -6px ${props => props.$color};
      height: 30px;
    }
  }
`;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
    width: '100%',
  }
});

export default Loader;
