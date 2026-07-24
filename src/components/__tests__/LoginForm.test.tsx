import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '../auth/LoginForm';

describe('LoginForm', () => {
  it('renders email and password fields', () => {
    render(<LoginForm />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Senha')).toBeInTheDocument();
  });

  it('renders submit button', () => {
    render(<LoginForm />);
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument();
  });

  it('does not render forgot password button when handler not provided', () => {
    render(<LoginForm />);
    expect(screen.queryByText('Esqueci minha senha')).toBeNull();
  });

  it('renders forgot password button when handler provided', () => {
    render(<LoginForm onForgotPassword={() => {}} />);
    expect(screen.getByText('Esqueci minha senha')).toBeInTheDocument();
  });

  it('calls onSubmit with email and password', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<LoginForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Email'), 'admin@empresa.com');
    await user.type(screen.getByLabelText('Senha'), 'senha123');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(onSubmit).toHaveBeenCalledWith('admin@empresa.com', 'senha123');
  });

  it('calls onForgotPassword when link clicked', async () => {
    const user = userEvent.setup();
    const onForgotPassword = vi.fn();
    render(<LoginForm onForgotPassword={onForgotPassword} />);
    await user.click(screen.getByText('Esqueci minha senha'));
    expect(onForgotPassword).toHaveBeenCalledOnce();
  });

  it('email input is of type email', () => {
    render(<LoginForm />);
    expect(screen.getByLabelText('Email')).toHaveAttribute('type', 'email');
  });

  it('password input is of type password', () => {
    render(<LoginForm />);
    expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'password');
  });
});
